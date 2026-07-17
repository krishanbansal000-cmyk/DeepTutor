"""Document loading for the LlamaIndex RAG pipeline.

Parser-backed files (PDF / Office / e-book) are converted through the shared
document-parse bridge (``deeptutor/services/parsing``), so the engine the user
picked in Settings → Document Parsing (text-only, MinerU, Docling, markitdown,
PyMuPDF4LLM) owns extraction. This is the same seam LightRAG and GraphRAG use;
routing LlamaIndex through it too means the parse-engine choice is honored by
every local retrieval engine, and image-capable engines' extracted images flow
into the multimodal ``ImageNode`` path below.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
import logging
import mimetypes
import os
from pathlib import Path
import re
from typing import Any, Iterable

from llama_index.core import Document
from llama_index.core.schema import ImageNode

from deeptutor.services.embedding import get_embedding_client
from deeptutor.services.llm.client import get_llm_client
from deeptutor.services.rag.file_routing import FileTypeRouter
from deeptutor.utils.document_validator import DocumentValidator

IMAGE_DESCRIPTION_SYSTEM_PROMPT = (
    "You describe images for a retrieval-augmented knowledge base. "
    "Be factual, concise, and include any visible text, labels, diagrams, "
    "tables, logos, or important visual relationships. Do not invent details."
)

IMAGE_DESCRIPTION_PROMPT = (
    "Describe this image so that a text-only answer generator can understand "
    "and cite it later. Include visible text/OCR if present, the main subject, "
    "and any educational or technical meaning. Keep the answer under 180 words."
)


@dataclass(frozen=True)
class _ImageSource:
    """An image to embed as an ``ImageNode``, plus the document it came from.

    ``path`` is the image file on disk (what gets embedded and served).
    ``origin`` is the document it belongs to: the image itself for a standalone
    image file, or the source PDF/e-book for an image extracted during parsing —
    so retrieval cites the source document rather than an opaque cache asset.
    """

    path: Path
    origin: Path
    description_hint: str = ""
    page_label: str = ""


class LlamaIndexDocumentLoader:
    """Convert source files into LlamaIndex ``Document`` / ``ImageNode`` objects."""

    def __init__(self, logger=None) -> None:
        self.logger = logger or logging.getLogger(__name__)

    async def load(self, file_paths: Iterable[str]) -> list[Any]:
        documents: list[Any] = []
        image_sources: list[_ImageSource] = []
        classification = FileTypeRouter.classify_files(list(file_paths))

        for file_path_str in classification.parser_files:
            file_path = Path(file_path_str)
            self.logger.info(f"Parsing document: {file_path.name}")
            text, extracted_images, blocks = self._parse_document(file_path)
            if not self._append_page_documents(documents, file_path, blocks):
                self._append_if_nonempty(documents, file_path, text)
            image_sources.extend(extracted_images)

        for file_path_str in classification.text_files:
            file_path = Path(file_path_str)
            self.logger.info(f"Parsing text: {file_path.name}")
            text = await FileTypeRouter.read_text_file(str(file_path))
            self._append_if_nonempty(documents, file_path, text)

        for file_path_str in classification.image_files:
            path = Path(file_path_str)
            image_sources.append(_ImageSource(path=path, origin=path))

        if image_sources:
            documents.extend(await self._load_image_nodes(image_sources))

        for file_path_str in classification.unsupported:
            self.logger.warning(f"Skipped unsupported file: {Path(file_path_str).name}")

        return documents

    def _parse_document(
        self,
        file_path: Path,
    ) -> tuple[str, list[_ImageSource], list[dict[str, Any]]]:
        """Parse a document through the shared, engine-pluggable parse layer.

        Returns ``(text, extracted_images, structured_blocks)``. A parse failure (engine
        unavailable, unsupported format for the active engine, or models not
        ready) is logged and the file is skipped — matching the sibling
        LightRAG/GraphRAG pipelines — rather than aborting the whole batch.
        """
        from deeptutor.services.parsing import ParserError, get_parse_service

        try:
            parsed = get_parse_service().parse(file_path)
        except ParserError as exc:
            self.logger.warning(
                f"Skipped {file_path.name}: the active document-parsing engine could "
                f"not handle it ({exc}). Change the engine in Settings → Document Parsing."
            )
            return "", [], []

        text = parsed.markdown.strip() or self._text_from_blocks(parsed.blocks)
        images = self._collect_asset_images(
            parsed.asset_dir,
            origin=file_path,
            markdown=text,
            blocks=list(parsed.blocks or []),
        )
        return text, images, list(parsed.blocks or [])

    def _append_page_documents(
        self,
        documents: list[Any],
        file_path: Path,
        blocks: list[dict[str, Any]],
    ) -> bool:
        """Create one LlamaIndex document per parsed page when available."""
        pages: dict[str, list[str]] = {}
        for block in blocks:
            if not isinstance(block, dict):
                continue
            text = str(block.get("text") or block.get("content") or "").strip()
            if not text:
                continue
            page: Any = block.get("page_label")
            if page in (None, ""):
                page = block.get("page")
            if page in (None, ""):
                page_index = block.get("page_index", block.get("page_idx"))
                if isinstance(page_index, int):
                    page = page_index + 1
            if page in (None, ""):
                continue
            pages.setdefault(str(page), []).append(text)

        if not pages:
            return False
        def _page_sort_key(item: tuple[str, list[str]]) -> tuple[int, int | str]:
            label = item[0]
            try:
                return (0, int(label))
            except ValueError:
                return (1, label)

        for page, parts in sorted(pages.items(), key=_page_sort_key):
            documents.append(
                Document(
                    text="\n\n".join(parts),
                    metadata={
                        "file_name": file_path.name,
                        "file_path": str(file_path),
                        "page": page,
                        "page_label": page,
                    },
                )
            )
        self.logger.info(f"Loaded: {file_path.name} ({len(pages)} page(s))")
        return True

    @staticmethod
    def _text_from_blocks(blocks: list[dict] | None) -> str:
        """Fall back to concatenating block text when an engine emits no markdown."""
        if not blocks:
            return ""
        parts = [
            str(block.get("text") or block.get("content") or "").strip()
            for block in blocks
            if isinstance(block, dict)
        ]
        return "\n\n".join(part for part in parts if part)

    def _collect_asset_images(
        self,
        asset_dir: Path | None,
        *,
        origin: Path,
        markdown: str = "",
        blocks: list[dict[str, Any]] | None = None,
    ) -> list[_ImageSource]:
        """Gather images the parse engine extracted into ``asset_dir``.

        Engines that don't extract images (text-only, markitdown) leave
        ``asset_dir`` empty, so this returns nothing and the document is indexed
        as text alone.
        """
        if not asset_dir or not Path(asset_dir).is_dir():
            return []
        hints = self._image_context_hints(markdown)
        pages = self._image_page_labels(blocks)
        images = [
            _ImageSource(
                path=child,
                origin=origin,
                description_hint=hints.get(child.name, ""),
                page_label=pages.get(child.name, ""),
            )
            for child in sorted(Path(asset_dir).iterdir())
            if child.is_file() and child.suffix.lower() in FileTypeRouter.IMAGE_EXTENSIONS
        ]
        if images:
            self.logger.info(
                f"Extracted {len(images)} image(s) from {origin.name} for multimodal indexing"
            )
        return images

    @staticmethod
    def _image_page_labels(blocks: list[dict[str, Any]] | None) -> dict[str, str]:
        """Map extracted image asset names to their source PDF page."""
        if not blocks:
            return {}
        image_re = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
        pages: dict[str, str] = {}
        for block in blocks:
            if not isinstance(block, dict):
                continue
            page = block.get("page_label", block.get("page", ""))
            if page in (None, ""):
                continue
            text = str(block.get("text") or block.get("content") or "")
            for match in image_re.finditer(text):
                target = match.group(1).strip().split(maxsplit=1)[0].strip('<>"')
                name = os.path.basename(target.replace("\\", "/"))
                if name:
                    pages[name] = str(page)
        return pages

    @staticmethod
    def _image_context_hints(markdown: str) -> dict[str, str]:
        """Collect nearby document text for each extracted Markdown image.

        PyMuPDF4LLM preserves image links in reading order.  Capturing a small
        window around each link gives a useful, source-grounded caption when
        the configured answer LLM is text-only.  The actual image still gets a
        visual embedding; this hint only makes retrieved results intelligible
        to a text-only response model.
        """
        if not markdown:
            return {}

        image_re = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
        lines = markdown.splitlines()
        hints: dict[str, str] = {}
        for index, line in enumerate(lines):
            for match in image_re.finditer(line):
                target = match.group(2).strip().split(maxsplit=1)[0].strip("<>\"")
                name = os.path.basename(target.replace("\\", "/"))
                if not name:
                    continue

                parts: list[str] = []
                alt = match.group(1).strip()
                if alt:
                    parts.append(alt)
                for nearby in lines[max(0, index - 2) : min(len(lines), index + 4)]:
                    cleaned = image_re.sub("", nearby)
                    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
                    cleaned = re.sub(r"^[#>*+\-\s]+", "", cleaned).strip()
                    if cleaned:
                        parts.append(cleaned)

                # Keep descriptions compact enough for source cards and BM25.
                hint = " ".join(dict.fromkeys(parts))
                hint = re.sub(r"\s+", " ", hint).strip()
                if hint:
                    hints[name] = hint[:700]
        return hints

    async def _load_image_nodes(self, sources: list[_ImageSource]) -> list[ImageNode]:
        embedding_client = get_embedding_client()
        if not embedding_client.supports_multimodal_contents():
            for source in sources:
                self.logger.warning(
                    "Skipped image because visual indexing requires a multimodal "
                    "embedding provider/model "
                    f"(binding={embedding_client.config.binding}, "
                    f"model={embedding_client.config.model}): "
                    f"{source.path.name}"
                )
            return []

        llm_client = get_llm_client()
        use_vision_descriptions = llm_client.supports_multimodal_images()
        if not use_vision_descriptions:
            self.logger.info(
                "The configured LLM is text-only; extracted images will still receive "
                "visual embeddings, with nearby document text used as their descriptions"
            )

        embedded: list[_ImageSource] = []
        descriptions: list[str] = []
        description_sources: list[str] = []
        contents = []
        for source in sources:
            try:
                image_payload = self._load_image_payload(source.path)
                description = ""
                description_source = "document_context"
                # Parsed PDFs can contain hundreds of extracted assets. They
                # already receive true visual embeddings below, and nearby
                # page text supplies the answer-facing caption. Reserve the
                # slower vision-LLM call for standalone image sources.
                if use_vision_descriptions and source.path == source.origin:
                    try:
                        description = await self._describe_image(
                            source.path,
                            image_payload["base64"],
                            image_payload["mimetype"],
                        )
                        description_source = "vision_llm"
                    except Exception as exc:
                        self.logger.warning(
                            "Could not describe image %s with the configured vision LLM; "
                            "using source context instead: %s",
                            source.path.name,
                            exc,
                        )
                if not description:
                    description = self._fallback_image_description(source)
                    description_source = (
                        "document_context" if source.description_hint else "source_fallback"
                    )
                if not description:
                    continue
                contents.append({"image": image_payload["data_uri"]})
                embedded.append(source)
                descriptions.append(description)
                description_sources.append(description_source)
            except OSError as exc:
                self.logger.error(f"Failed to read image {source.path.name}: {exc}")
            except Exception as exc:
                self.logger.error(
                    "Failed to prepare image %s for multimodal embedding: %s",
                    source.path.name,
                    exc,
                )

        if not contents:
            return []

        try:
            embeddings = await embedding_client.embed_contents(
                contents,
                input_type="search_document",
            )
        except Exception as exc:
            self.logger.error(
                "Failed to embed image contents with configured multimodal embedding "
                "provider/model (binding=%s, model=%s): %s",
                embedding_client.config.binding,
                embedding_client.config.model,
                exc,
            )
            return []
        nodes: list[ImageNode] = []
        for source, description, description_source, embedding in zip(
            embedded,
            descriptions,
            description_sources,
            embeddings,
        ):
            mimetype = mimetypes.guess_type(source.path.name)[0] or "application/octet-stream"
            metadata = {
                "file_name": source.origin.name,
                "file_path": str(source.origin),
                "content_type": "image",
                "image_description": description,
                "image_description_source": description_source,
            }
            if source.page_label:
                metadata.update(page=source.page_label, page_label=source.page_label)
            nodes.append(
                ImageNode(
                    text=f"[Image] {source.origin.name}\n\n{description}",
                    image_path=str(source.path),
                    image_mimetype=mimetype,
                    metadata=metadata,
                    embedding=embedding,
                )
            )
            self.logger.info(f"Loaded image: {source.path.name} ({len(embedding)}D vector)")
        return nodes

    @staticmethod
    def _fallback_image_description(source: _ImageSource) -> str:
        if source.description_hint:
            return source.description_hint
        return (
            f"Visual extracted from {source.origin.name}. "
            f"Asset name: {source.path.name}."
        )

    async def _describe_image(self, file_path: Path, image_base64: str, mimetype: str) -> str:
        llm_client = get_llm_client()
        response = await llm_client.complete(
            IMAGE_DESCRIPTION_PROMPT,
            system_prompt=IMAGE_DESCRIPTION_SYSTEM_PROMPT,
            image_data=image_base64,
            image_mime_type=mimetype,
            image_filename=file_path.name,
        )
        return response.strip()

    def _load_image_payload(self, file_path: Path) -> dict[str, str]:
        size = file_path.stat().st_size
        if size > DocumentValidator.MAX_FILE_SIZE:
            raise OSError(
                f"image file too large: {size} bytes; "
                f"maximum allowed: {DocumentValidator.MAX_FILE_SIZE} bytes"
            )
        mimetype = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
        return {
            "base64": encoded,
            "data_uri": f"data:{mimetype};base64,{encoded}",
            "mimetype": mimetype,
        }

    def _append_if_nonempty(self, documents: list[Any], file_path: Path, text: str) -> None:
        if text.strip():
            documents.append(
                Document(
                    text=text,
                    metadata={
                        "file_name": file_path.name,
                        "file_path": str(file_path),
                    },
                )
            )
            self.logger.info(f"Loaded: {file_path.name} ({len(text)} chars)")
        else:
            self.logger.warning(f"Skipped empty document: {file_path.name}")
