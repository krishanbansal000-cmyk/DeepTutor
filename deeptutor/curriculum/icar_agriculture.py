"""ICAR B.Sc. (Hons) Agriculture curriculum template.

Ported from Drona's ``src/lib/curriculum/icar-agriculture.ts``.
Transcribed from the University of Lucknow course curriculum.
Full syllabi are included for Semesters I and II; later semesters carry
the official structure (codes, titles, credits, grading).
"""

from __future__ import annotations

from deeptutor.curriculum.models import CurriculumTemplate, ExitAward, TemplateCourse

_C = TemplateCourse


ICAR_AGRICULTURE = CurriculumTemplate(
    code="ICAR-BSC-AGRI",
    name="B.Sc. (Hons) Agriculture",
    framework="ICAR Sixth Deans' Committee + NEP-2020",
    degree="B.Sc. (Hons)",
    discipline="Agriculture",
    description=(
        "Four-year undergraduate programme in Agriculture as per the ICAR Sixth "
        "Deans' Committee guidelines and the NEP-2020 framework, with multiple "
        "entry/exit, skill-enhancement courses, electives, and a final-year "
        "Student READY (RAWE) experiential year."
    ),
    duration_years=4,
    total_credits=177,
    exit_awards=[
        ExitAward(afterYear=1, award="UG-Certificate in Agriculture"),
        ExitAward(afterYear=2, award="UG-Diploma in Agriculture"),
        ExitAward(afterYear=4, award="B.Sc. (Hons) Agriculture"),
    ],
    metadata={"onlineCredits": 10, "electiveChoose": {"Semester VII Electives": 5}},
    courses=[
        # ── Year 1 · Semester I ──────────────────────────────────────────────
        _C(1, 1, "AGRNG-101", "Induction cum Foundation Course (Deekshaarambh)", "foundation", (1, 1, 0),
           grading="non_gradial",
           objectives="Support the cultural integration of students from diverse backgrounds; understand the academic framework; improve life and social skills; develop social awareness, ethics, values, teamwork, leadership and creativity; identify strengths and weaknesses in core areas of the discipline.",
           theory="Interactions with academia; interaction with alumni, business leaders, prospective employers and achievers; group activities to identify strengths and weaknesses and learn from each other's life experiences; activities to enhance cultural integration; visits to related fields/establishments; sessions on personality development for life and social skills, ethics and values, teamwork, leadership and communication skills."),
        _C(1, 1, "AGRNG-102", "Introductory Mathematics", "foundation", (1, 1, 0),
           grading="non_gradial", marks=(75, 25, 0),
           objectives="To provide preliminary knowledge of mathematics to the students.",
           theory="Algebra: arithmetic, geometric and harmonic progressions. Matrices: definition, operations, transpose and inverse up to 3rd order, determinants and their evaluation. Differential calculus: differentiation from first principles, derivatives of sum/difference/product/quotient, increasing and decreasing functions; applications — growth rate, average and marginal cost/revenue. Partial differentiation: homogeneous functions, Euler's theorem, maxima and minima. Integral calculus: definite and indefinite integrals, integration by substitution and by parts, area under simple curves. Mathematical models in agricultural systems — fitting linear, quadratic and exponential models.",
           readings=[
               "NCERT, 2012, Mathematics of Class XII, NCERT, India.",
               "A Textbook of Mathematics XI and XII (Part I and II), Maharashtra State Board.",
               "Sharma RD, 2014, Mathematics of Class XII, Dhanpat Rai Publishing.",
           ]),
        _C(1, 1, "AGRSEC-101", "Mushroom Production Technology", "skill", (2, 0, 2),
           marks=(0, 0, 100),
           objectives="Study of current status and scope of mushroom production technology in India and U.P. and its potential for entrepreneurship.",
           practical="Features of edible fungi; nutritional and medicinal value; types of media, sterilization; tissue culture, sub-culturing, maintenance and preservation; spawn preparation (grain, sawdust, liquid) and quality control; identification of wild mushrooms; raw material formulation for Agaricus bisporus; composting (long vs short method); casing preparation and crop management; mushroom farm design and infrastructure; cultivation of Pleurotus florida (Dhingri), Volvariella volvacea (paddy straw), Calocybe indica (milky) and Lentinus edodes (Shiitake); marketing — market analysis, distribution, pricing; diseases and their control; value-added products; economics of mushroom production; exposure visits to commercial units.",
           readings=[
               "A textbook on mushroom cultivation: Theory and Practice, Aggarwal, Sharma and Jangra, Newrays.",
               "Mushroom Cultivation, Tripathi D.P. (2005), Oxford & IBH.",
               "Mushroom cultivation technology, Acharya, Roy and Sarkar, Techno world, Kolkata.",
           ]),
        _C(1, 1, "AGRSEC-102", "Beneficial Insect Farming", "skill", (2, 0, 2),
           marks=(0, 0, 100),
           objectives="To learn about apiculture (beekeeping) — the scientific maintenance of honeybee colonies in hives to collect honey, beeswax and propolis for professional marketing.",
           practical="Historical development of apiculture; classification of bees; distribution of genus Apis; morphology and anatomy of honeybee; honeybee biology, behaviour and communication; commercial beekeeping; design and use of bee hives and equipment; seasonal bee husbandry; honeybee nutrition; absconding, swarming, drifting; bee breeding and queen rearing; bee pests, parasites and diseases and their management; honey composition, quality and processing; pollination — role of bee pollinators in crop productivity; developing a beekeeping project.",
           readings=[
               "Singh S., 1975, Beekeeping in India, ICAR, New Delhi.",
               "Singh D and Singh D.P. 2006. A handbook of Beekeeping, Agrobios (India).",
               "Mishra R.C. (1995) Honeybees and their management in India, ICAR.",
           ]),
        _C(1, 1, "AGR-101", "Communication Skills", "core", (2, 1, 1),
           marks=(50, 20, 30),
           objectives="To acquire competence in oral, written and non-verbal communication, develop strong personal and professional communication and demonstrate positive group communication.",
           theory="Communication process — building self-esteem and overcoming fears; concept, nature and significance; verbal and non-verbal communication; linguistic and non-linguistic barriers; basic skills — listening, speaking, reading and writing; précis writing, abstracting, summarizing; technical communication; curriculum vitae/resume writing; structural and functional grammar — sentence structure, modifiers, connectives, case, agreement of verb with subject, tense, mood, voice; effective sentences; basic sentence faults.",
           practical="Listening and note-taking; précis writing, summarizing, abstracting; reading and comprehension of general and technical articles; micro-presentations and feedback; stage manners — grooming, body language, voice modulation; group discussions; public speaking; vocabulary building; interview techniques; organization of events.",
           readings=[
               "Kumar S and Pushpa Lata, 2011, Communication Skills, Oxford University Press.",
               "Francis Peter S J, 2012, Soft Skills and Professional Communication, Tata McGraw Hill.",
               "Carnegie Dale, 1997, The Quick and Easy Way to Effective Speaking, Pocket Books.",
           ]),
        _C(1, 1, "AGR-102", "Fundamentals of Agronomy", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To impart the basic and fundamental knowledge of Agronomy.",
           theory="Agronomy — definition, meaning and scope; art, science and business of crop production; classification of field crops; seeds and sowing; factors affecting crop establishment; tillage and tilth; crop density and geometry; crop nutrition — essential nutrients, manures and fertilizers, INM, green manuring; water management — soil moisture, crop water requirement, irrigation scheduling; weeds and their control; cropping systems; sustainable crop production; allelopathy; growth and development of crops.",
           practical="Visit to crop farm; identification of crops, seeds, fertilizers; tillage and inter-cultivation implements; calculation of seed rate, plant population and fertilizer requirement; yield estimation; weed identification; seed germination and viability test; methods of fertilizer and manure application; measurement of soil moisture, field capacity, irrigation requirement and infiltration rate.",
           readings=[
               "Reddy Yellamanda T and Shankar Reddy G H, 1995, Principles of Agronomy, Kalyani Publishers.",
               "Yawalkar K S and Agarwal J P, 1977, Manures and Fertilizers, Agri-Horticultural Publishing House.",
               "Reddy S.R. 2008, Principle of Crop Production, Kalyani Publishers.",
           ]),
        _C(1, 1, "AGR-103", "Fundamentals of Soil Science", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To impart knowledge on soil genesis and basic soil properties with respect to plant growth.",
           theory="Soil — pedological and edaphological concepts; rocks and minerals, weathering, soil formation, soil profile; soil texture, structure, bulk and particle density, consistency, temperature, air, water; soil reaction and buffering capacity; soil taxonomy and keys to soil orders; soils of India.",
           practical="Properties of minerals; igneous, sedimentary and metamorphic rocks; soil profile study; soil texture-feel and mechanical analysis; bulk density, particle density, porosity; soil colour, structure, aggregate analysis; soil moisture constants — field capacity, water holding capacity; infiltration rate.",
           readings=[
               "Soil Fertility and Nutrient Management — S. S. Singh, Kalyani Publishers.",
               "Introductory Soil Science — Dilip Kumar Das, Kalyani Publishers.",
               "The Nature and Properties of Soils — Harry O. Buckman and Nyle C. Brady.",
           ]),
        _C(1, 1, "AGR-104", "Fundamentals of Horticulture", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To provide knowledge about the branches of horticulture, orchard management, propagation methods and the physiological aspects of horticultural crops.",
           theory="Horticulture — branches, importance and scope; botanical classification; soil and climate for horticultural crops; plant propagation methods and structures; seed dormancy and germination; orchard establishment; training and pruning of fruit crops; juvenility and flower-bud differentiation, unfruitfulness; pollination, fertilization and parthenocarpy; bioregulators; irrigation and fertilizer application; medicinal and aromatic plants.",
           practical="Identification and nomenclature of fruits; layout of an orchard; pit making and planting systems; nursery raising; propagation through seeds and plant parts; potting and repotting; training and pruning; fertilizer mixture preparation; layout of irrigation systems; maturity studies; harvesting, grading, packaging and storage.",
           readings=[
               "Introduction to Horticulture, by N. Kumar.",
               "Basics of Horticulture, by Jitendra Singh.",
               "Handbook of Horticulture, by K.L. Chadda.",
           ]),
        _C(1, 1, "AGR-105", "Farming Based Livelihood Systems", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To make students aware of farming-based livelihood systems and how farming-based systems can be a source of livelihood.",
           theory="Status of agriculture in India; livelihood — definition, concept and pattern; agricultural livelihood systems (ALS); farming systems and farming-based livelihood systems prevalent in India; components — crops, livestock, horticulture, agro-forestry, aqua culture; value chains and secondary enterprises; factors affecting integration; commercial farming-based livelihood models by NABARD, ICAR and others; risk and success factors; government and private schemes; role of farming-based livelihood in the 21st century — circular economy, green economy, climate change and digitalization.",
           practical="Survey of farming systems and agriculture-based livelihood enterprises; study of components of important models across agro-climatic zones; production and profitability of crop-based, livestock-based, processing-based and integrated models; field visit of innovative farming system models; project formulation with cost and profit analysis; case study of agri start-ups.",
           readings=[
               "Reddy S.R. 2016, Farming System and Sustainable Agriculture, Kalyani Publishers.",
               "Dixon J. and Gulliver A. with Gibbon D. (2001), Farming Systems and Poverty, FAO & World Bank.",
               "Walia S. S. and Walia U. S., 2020, Farming System and Sustainable Agriculture, Scientific Publishers.",
           ]),
        _C(1, 1, "AGR-106", "Rural Sociology and Educational Psychology", "core", (2, 2, 0),
           marks=(75, 25, 0),
           objectives="Provide knowledge on the concept and importance of sociology and rural sociology and its relationship with Extension Education.",
           theory="Extension education and agricultural extension; sociology and rural sociology — meaning, scope, importance; Indian rural society; social groups; social stratification — class and caste; culture, customs, folkways, mores, taboos, rituals and traditions; social values and attitudes; social institutions, organizations and control; social change; leadership; psychology and educational psychology; intelligence; personality; teaching-learning process — elements of learning situation, principles of learning and their implication for teaching.",
           readings=[
               "J.B. Chitambar — Introductory Rural Sociology.",
               "A. R. Desai — Rural Sociology in India.",
               "M.B. Ghorpade — Essentials of Psychology.",
           ]),
        _C(1, 1, "AGR-107", "National Service Scheme (NSS-I) / National Cadet Corps (NCC-I)", "foundation", (1, 0, 1),
           marks=(0, 0, 100),
           objectives="Develop discipline, social responsibility and an understanding of nation-building through NCC drill/field-craft or NSS community service.",
           theory="NCC: aims and organization, drill, marching, command and control, nation building, social service, structure and function of the human body, health and adventure. NSS: at least 60 hours of social work, orientation, code of conduct, programme activities, special camping, community mobilization, citizenship and human rights."),

        # ── Year 1 · Semester II ─────────────────────────────────────────────
        _C(1, 2, "AGRSEC-201", "Poultry Production Technology", "skill", (2, 0, 2),
           marks=(0, 0, 100),
           objectives="To make students aware about the poultry-based livelihood system, expose them to establishment and management of a poultry farm, and enhance employment and entrepreneurship skills.",
           practical="Layer farm layout — chick, grower and layer houses; selection and culling, debeaking, deworming, vaccination and routine operations; farm sanitation and waste disposal; visit to commercial layer farms; hen-day and hen-housed egg production; broiler farm location, layout and house design; broiler brooding, medication, vaccination, transportation, record keeping; cost of production of broilers; feeding and feed efficiency.",
           readings=[
               "A Textbook of Animal Husbandry by G. C. Banerjee (8th Edition).",
               "Livestock Production Management by N.S.R. Sastry and C.K. Thomas (2021).",
               "Textbook of Commercial Poultry production and Hatchery Management by Dr. M. Murgan (2019).",
           ]),
        _C(1, 2, "AGRSEC-202", "Post-Harvest Processing Technology", "skill", (2, 0, 2),
           marks=(0, 0, 100),
           objectives="Gain knowledge on pre- and post-harvest physiology and management technologies of fruits and vegetables, and conventional and modern packaging and preservation technology.",
           practical="Importance and scope of post-harvest technology; nature and structure of horticultural produce; pre and post-harvest losses; climacteric and non-climacteric fruits; regulation of ripening; maturity indices; harvesting tools; curing, washing, sorting and grading; post-harvest handling; equipment for washing, sizing, grading; VHT, irradiation, skin coating, degreening; packaging techniques; cold-chain and transport; protective skin coating; control of sprouting; visit to packaging centers and markets.",
           readings=[
               "Chattopadhya SK. 2007. Handling, transportation and storage of fruits and vegetables, GeneTech books.",
               "Chandra Gopala Rao. 2015. Engineering for Storage of Fruits and Vegetables, Academic Press.",
               "Coles R, McDowell D and Kirwan MJ (Eds). 2003. Food Packaging Technology, Blackwell Publishing.",
           ]),
        _C(1, 2, "AGR-201", "Personality Development", "core", (2, 1, 1),
           marks=(50, 20, 30),
           objectives="To help students realize their potential strengths, cultivate inter-personal skills and improve employability.",
           theory="Personality — definition, nature, theories and types; humanistic approach and Maslow's self-actualization; Myers-Briggs typology; locus of control; Type A and Type B personality; organizational behaviour; perception and attribution; learning — theories and principles; attitude and values; intelligence and emotional intelligence; motivation, teamwork and group dynamics.",
           practical="MBTI personality analysis; learning styles; motivational needs; FIRO-B; interpersonal communication; teamwork and team building; win-win game; conflict management; leadership styles; case studies.",
           readings=[
               "Andrews, Sudhir, 1988, How to Succeed at Interviews, Tata McGraw-Hill.",
               "Heller, Robert, 2002, Effective Leadership, Dk Publishing.",
               "Pravesh Kumar, 2005, All about Self-Motivation, Goodwill Publishing.",
           ]),
        _C(1, 2, "AGR-202", "Environmental Studies and Disaster Management", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To expose and acquire knowledge on the environment and gain skill and expertise on management of disasters.",
           theory="Introduction to environment; segments and spheres of earth; natural resources; ecosystems — structure, function and energy flow; biodiversity and its conservation; environmental pollution — air, water, soil, marine, noise, thermal, light; solid waste management; environmental ethics — climate change, global warming, acid rain, ozone depletion; environmental protection acts; human population, health and environment; disaster management — natural and man-made disasters; national strategy and framework for disaster reduction; role of NGOs, administration and armed forces.",
           practical="Documenting environmental assets; biodiversity assessment; water quality analysis — pH, EC, TDS, acidity, alkalinity, hardness, DO, BOD, COD; enumeration of E. coli; suspended particulate matter; study of ecosystems; visit to areas affected by natural disaster.",
           readings=[
               "Erach Bharucha, Textbook for Environmental Studies, UGC, New Delhi.",
               "De A.K., 2010, Environmental Chemistry, New Age International Publishers.",
               "Tyler Miller and Scot Spoolman, 2009, Living in the Environment, Brooks/cole.",
           ]),
        _C(1, 2, "AGR-203", "Soil Fertility Management", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To provide comprehensive knowledge of soil fertility, plant nutrition, fertilizers and nutrient management.",
           theory="Importance of manures and fertilizers; fertilizer recommendation approaches; integrated nutrient management; chemical fertilizers — classification, composition and properties; nano fertilizers; soil amendments; fertilizer control order; criteria of essentiality; deficiency and toxicity symptoms; nutrient transport to plants; chemistry of macro and micronutrients; soil fertility evaluation and soil testing; critical levels; methods of fertilizer recommendation; nutrient use efficiency; STCR/RTNM/IPNS.",
           practical="Calibration of colorimetry and flame photometry; estimation of alkaline hydrolysable N; extractable P; exchangeable K, Ca and Mg; extractable S; DTPA extractable Zn; estimation of N, P, K, S in plants.",
           readings=[
               "Soil Fertility and Nutrient Management — S. S. Singh, Kalyani Publishers.",
               "Soil Fertility and Fertilizers — Tisdale, Nelson and Beaton, Macmillan.",
               "The Nature and Properties of Soils — Buckman and Brady.",
           ]),
        _C(1, 2, "AGR-204", "Fundamentals of Entomology", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="To know the history and classification of insects, study morphological characters of class Insecta, understand insect physiological systems, and the economically important insect orders and families.",
           theory="History of entomology; dominance of Insecta; classification of phylum Arthropoda; morphology — cuticle, body segmentation, head, thorax, abdomen, antennae, mouthparts, legs, wings; metamorphosis and diapause; digestive, circulatory, excretory, respiratory, nervous, secretory and reproductive systems; systematics — taxonomy and binomial nomenclature; classification of class Insecta to orders; agriculturally important orders and families — Orthoptera, Hemiptera, Lepidoptera, Coleoptera, Hymenoptera, Diptera and others.",
           practical="Collection and preservation of insects; external features of grasshopper/blister beetle; insect antennae, mouthparts and legs; wing venation; insect larvae and pupae; dissection of digestive system; study of orders and families of agricultural importance; insecticides and formulations; sampling techniques.",
           readings=[
               "Imm's General Textbook of Entomology, O.W. Richards and R.G. Davies.",
               "Introduction to the Study of Insects, Borror and DeLong.",
               "Integrated Pest Management Concept and Approaches, Dhaliwal and Arora.",
           ]),
        _C(1, 2, "AGR-205", "Livestock and Poultry Management", "core", (2, 1, 1),
           marks=(50, 20, 30),
           objectives="Provide basic knowledge of scientific livestock and poultry rearing practices, and entrepreneurship through livestock/poultry integrated farming.",
           theory="Role of livestock in national economy; reproduction in farm animals and poultry; housing principles and space requirements; management of calves, heifers and milch animals; management of sheep, goat and swine; incubation, hatching and brooding; Indian and exotic breeds; digestion in livestock and poultry; classification of feedstuffs; nutrients and their functions; feeding of livestock and poultry; livestock and poultry diseases — prevention, vaccination and control.",
           practical="External body parts; handling and restraining; identification methods; visit to dairy and poultry farms; judging of cattle, buffalo and poultry; culling; housing layout; ration computation; clean milk production; hatchery operations; debeaking, dusting and vaccination; economics of production.",
           readings=["A Textbook of Animal Husbandry by G. C Banerjee.", "A Textbook of Livestock Production Management in Tropics by D. N. Verma."]),
        _C(1, 2, "AGR-206", "Fundamentals of Plant Pathology", "core", (3, 2, 1),
           marks=(50, 20, 30),
           objectives="Understand the role of microorganisms in plant disease, general concepts and classification of plant diseases, characteristics of pathogens, and principles of plant disease management.",
           theory="Concept of disease in plants; terms used in plant pathology; history; causes of plant disease — inanimate and animate; classification; parasitism and pathogenesis; disease triangle, tetrahedron and disease cycle; fungi, bacteria, virus, viroids and other pathogens — morphology, reproduction, classification and phytopathogenic aspects; principles of plant disease management — chemicals, host resistance, cultural and biological methods, Integrated Disease Management (IDM).",
           practical="Study of microscope and laboratory equipment; plant disease symptoms; microscopic examination of fungi and bacteria; staining; preparation of culture media; isolation and purification of plant pathogens; Koch's postulates; study of fungicides — characteristics, formulation, methods of application and calculation.",
           readings=[
               "Agrios, GN. 2010. Plant Pathology. Acad. Press.",
               "Singh RS. 2013. Introduction to Principles of Plant Pathology. Oxford and IBH.",
               "Mehrotra RS & Aggarwal A. 2007. Plant Pathology. Tata McGraw Hill.",
           ]),
        _C(1, 2, "AGR-207", "National Service Scheme (NSS-II) / National Cadet Corps (NCC-II)", "foundation", (1, 0, 1),
           marks=(0, 0, 100),
           objectives="Advance NCC arms-drill, map reading and field-craft, or NSS youth-leadership, life competencies and health education.",
           theory="NCC-II: arms drill, characteristics of rifle, range procedure, maps and field-craft, field defences and section battle drill. NSS-II: youth leadership, life competencies, problem-solving and decision-making, youth development programmes, health, hygiene and sanitation, yoga."),
        _C(1, 2, "AGRNG-201", "Introductory Biology", "foundation", (2, 1, 1),
           grading="non_gradial", marks=(75, 25, 0),
           objectives="Describe levels of organization and functions in plants and animals; identify characteristics and needs of living organisms and ecosystems; explain growth and development; design and assess scientific investigations; demonstrate critical thinking.",
           theory="Introduction to the living world — diversity and characteristics of life, origin of life, evolution and eugenics; binomial nomenclature and classification; cell and cell division; morphology of flowering plants; seed and seed germination; plant systematics — Brassicaceae, Fabaceae and Poaceae; role of animals in agriculture.",
           practical="Morphology of flowering plants — root, stem and leaf and their modifications; inflorescence, flower and fruits; cell, tissues and cell division; internal structure of root, stem and leaf; description of Brassicaceae, Fabaceae and Poaceae.",
           readings=[
               "Cell Biology, Genetics, Molecular Biology and Evolution by P.S. Verma, V.K. Agrawal, S. Chand.",
               "A Class-book of Botany by A.C. Dutta, Oxford University Press.",
               "Fundamentals of Genetics by B.D. Singh, Kalyani Publications.",
           ]),

        # ── Year 2 · Semester III ───────────────────────────────────────────
        _C(2, 3, "AGRSEC-301", "Organic Production Technology", "skill", (2, 0, 2), marks=(0, 0, 100)),
        _C(2, 3, "AGR-301", "Entrepreneurship Development and Business Management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-302", "Physical Education, First Aid and Yoga Practices", "foundation", (2, 0, 2), marks=(0, 0, 100)),
        _C(2, 3, "AGR-303", "Principles of Genetics", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-304", "Crop Production Technology-I (Kharif crops)", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-305", "Production Technology of Fruit and Plantation Crops", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-306", "Fundamentals of Extension Education", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-307", "Fundamentals of Nematology", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-308", "Insect Ecology and Integrated Pest Management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 3, "AGR-309", "Principles and Practices of Natural Farming", "core", (2, 1, 1), marks=(50, 20, 30)),

        # ── Year 2 · Semester IV ────────────────────────────────────────────
        _C(2, 4, "AGRSEC-401", "Biofertilizer and Biopesticide Production", "skill", (2, 0, 2), marks=(0, 0, 100)),
        _C(2, 4, "AGR-401", "Agricultural Informatics and Artificial Intelligence", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-402", "Production Technology of Vegetables and Spices", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-403", "Principles of Agricultural Economics and Farm Management", "core", (2, 2, 0), marks=(75, 25, 0)),
        _C(2, 4, "AGR-404", "Crop Production Technology-II (Rabi Crops)", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-405", "Farm Machinery and Power", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-406", "Water Management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-407", "Problematic Soils and their management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(2, 4, "AGR-408", "Basics of Plant Breeding", "core", (3, 2, 1), marks=(50, 20, 30)),

        # ── Year 3 · Semester V ─────────────────────────────────────────────
        _C(3, 5, "AGR-501", "Agricultural Marketing and Trade", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-502", "Introduction to Agro-meteorology", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-503", "Fundamentals of Crop Physiology", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-504", "Pest management in Crops and Stored Grains", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-505", "Diseases of Field and Horticultural Crops and their Management", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-506", "Crop Improvement-I", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-507", "Weed Management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-508", "Ornamental Crops, MAPs and Landscaping", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGR-509", "Introductory Agroforestry", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 5, "AGRT-501", "Educational Tour", "tour", (2, 0, 2), grading="non_gradial"),

        # ── Year 3 · Semester VI ────────────────────────────────────────────
        _C(3, 6, "AGR-601", "Fundamentals of Agri-Biotechnology", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-602", "Basic and Applied Agricultural Statistics", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-603", "Crop Improvement-II", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-604", "Renewable Energy in Agriculture and Allied Sector", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-605", "Dryland Agriculture / Rainfed Agriculture and Watershed Management", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-606", "Essentials of Plant Biochemistry", "core", (3, 2, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-607", "Agricultural Microbiology and Bioremediation", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-608", "Agricultural Finance and Cooperation", "core", (2, 1, 1), marks=(50, 20, 30)),
        _C(3, 6, "AGR-609", "Fundamentals of Seed Science and Technology", "core", (2, 1, 1), marks=(50, 20, 30)),

        # ── Year 4 · Semester VII — Electives (choose any 5) ────────────────
        _C(4, 7, "AGREC-701", "Agri-Business Management", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-702", "Commercial Plant Breeding", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-703", "Biopesticides and Biofertilizers", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-704", "Hi-tech Horticulture", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-705", "Protected Cultivation", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-706", "Commercial Seed Production", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-707", "Principles and Practices of Organic Farming and Conservation Agriculture", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-708", "Food Science and Nutrition", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),
        _C(4, 7, "AGREC-709", "Post Harvest Technology and Value Addition", "elective", (4, 3, 1), marks=(50, 20, 30), elective_group="Semester VII Electives"),

        # ── Year 4 · Semester VIII — Student READY (RAWE / Experiential) ────
        _C(4, 8, "AGR-RAWE-801", "RAWE — Agronomy", "experiential", (2, 0, 2), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-802", "RAWE — Genetics and Plant Breeding", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-803", "RAWE — Soil Science and Agricultural Chemistry", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-804", "RAWE — Animal Husbandry and Dairying", "experiential", (2, 0, 2), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-805", "RAWE — Agricultural Economics", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-806", "RAWE — Agricultural Engineering", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-807", "RAWE — Plant Pathology", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-808", "RAWE — Horticulture", "experiential", (2, 0, 2), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-809", "RAWE — Agricultural Extension", "experiential", (2, 0, 2), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-810", "RAWE — Soil Conservation", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-811", "RAWE — Agricultural Entomology", "experiential", (1, 0, 1), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-812", "RAWE — Plant Clinic", "experiential", (2, 0, 2), marks=(0, 0, 100)),
        _C(4, 8, "AGR-RAWE-813", "RAWE — Agro-Industrial Attachment", "experiential", (3, 0, 3), marks=(0, 0, 100)),
    ],
)

ALL_TEMPLATES: list[CurriculumTemplate] = [ICAR_AGRICULTURE]

__all__ = ["ALL_TEMPLATES", "ICAR_AGRICULTURE"]
