-- NextCampus admission catalog — STARTER reference data.
--
-- * Idempotent: rows are inserted only if their key/slug does not exist yet, so
--   re-running never overwrites edits made by platform admins in the UI.
-- * Safe in every environment (no accounts, no secrets). Run it once in
--   production after migrations:  psql "$DATABASE_URL" -f supabase/reference-data/catalog.sql
--   Locally it runs automatically on `supabase db reset` (see config.toml).
-- * This is a starting list, not a fixed enumeration. Platform admins add,
--   edit, reorder and deactivate entries at /platform/catalog.
-- * Format notes are deliberately general: admission rules change every year,
--   and students are always pointed to the official circular.

-- Categories ------------------------------------------------------------------
insert into public.university_categories (key, name_en, name_bn, sort_order) values
  ('general', 'General universities', 'সাধারণ বিশ্ববিদ্যালয়', 10),
  ('engineering', 'Engineering & technology', 'প্রকৌশল ও প্রযুক্তি', 20),
  ('science_technology', 'Science & technology universities', 'বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 30),
  ('agricultural', 'Agricultural universities', 'কৃষি বিশ্ববিদ্যালয়', 40),
  ('medical', 'Medical & dental', 'মেডিকেল ও ডেন্টাল', 50),
  ('cluster', 'Cluster admission', 'গুচ্ছ ভর্তি', 60)
on conflict (key) do nothing;

-- Subjects --------------------------------------------------------------------
insert into public.subjects (slug, name_en, name_bn, sort_order) values
  ('physics', 'Physics', 'পদার্থবিজ্ঞান', 10),
  ('chemistry', 'Chemistry', 'রসায়ন', 20),
  ('higher-mathematics', 'Higher Mathematics', 'উচ্চতর গণিত', 30),
  ('biology', 'Biology', 'জীববিজ্ঞান', 40),
  ('bangla', 'Bangla', 'বাংলা', 50),
  ('english', 'English', 'ইংরেজি', 60),
  ('general-knowledge', 'General Knowledge', 'সাধারণ জ্ঞান', 70),
  ('ict', 'ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 80),
  ('accounting', 'Accounting', 'হিসাববিজ্ঞান', 90),
  ('business-management', 'Business Organisation & Management', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 100),
  ('finance-banking', 'Finance, Banking & Insurance', 'ফিন্যান্স, ব্যাংকিং ও বিমা', 110),
  ('economics', 'Economics', 'অর্থনীতি', 120)
on conflict (slug) do nothing;

-- Universities ----------------------------------------------------------------
insert into public.universities (slug, short_code, name_en, name_bn, category_key, website, sort_order) values
  ('du', 'DU', 'University of Dhaka', 'ঢাকা বিশ্ববিদ্যালয়', 'general', 'https://www.du.ac.bd', 10),
  ('buet', 'BUET', 'Bangladesh University of Engineering and Technology', 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়', 'engineering', 'https://www.buet.ac.bd', 20),
  ('ru', 'RU', 'University of Rajshahi', 'রাজশাহী বিশ্ববিদ্যালয়', 'general', 'https://www.ru.ac.bd', 30),
  ('cu', 'CU', 'University of Chittagong', 'চট্টগ্রাম বিশ্ববিদ্যালয়', 'general', 'https://cu.ac.bd', 40),
  ('ju', 'JU', 'Jahangirnagar University', 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', 'general', 'https://www.juniv.edu', 50),
  ('ku', 'KU', 'Khulna University', 'খুলনা বিশ্ববিদ্যালয়', 'general', 'https://ku.ac.bd', 60),
  ('sust', 'SUST', 'Shahjalal University of Science and Technology', 'শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'science_technology', 'https://www.sust.edu', 70),
  ('kuet', 'KUET', 'Khulna University of Engineering & Technology', 'খুলনা প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'engineering', 'https://www.kuet.ac.bd', 80),
  ('cuet', 'CUET', 'Chittagong University of Engineering & Technology', 'চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'engineering', 'https://www.cuet.ac.bd', 90),
  ('ruet', 'RUET', 'Rajshahi University of Engineering & Technology', 'রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'engineering', 'https://www.ruet.ac.bd', 100),
  ('jnu', 'JnU', 'Jagannath University', 'জগন্নাথ বিশ্ববিদ্যালয়', 'general', 'https://jnu.ac.bd', 110),
  ('butex', 'BUTEX', 'Bangladesh University of Textiles', 'বাংলাদেশ টেক্সটাইল বিশ্ববিদ্যালয়', 'engineering', 'https://www.butex.edu.bd', 120),
  ('mbstu', 'MBSTU', 'Mawlana Bhashani Science and Technology University', 'মাওলানা ভাসানী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'science_technology', 'https://mbstu.ac.bd', 130),
  ('hstu', 'HSTU', 'Hajee Mohammad Danesh Science and Technology University', 'হাজী মোহাম্মদ দানেশ বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'science_technology', 'https://www.hstu.ac.bd', 140),
  ('pstu', 'PSTU', 'Patuakhali Science and Technology University', 'পটুয়াখালী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'science_technology', 'https://www.pstu.ac.bd', 150),
  ('bau', 'BAU', 'Bangladesh Agricultural University', 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয়', 'agricultural', 'https://www.bau.edu.bd', 160),
  ('iu', 'IU', 'Islamic University, Bangladesh', 'ইসলামী বিশ্ববিদ্যালয়, বাংলাদেশ', 'general', 'https://www.iu.ac.bd', 170),
  ('medical', 'MBBS/BDS', 'Medical & Dental Admission (MBBS/BDS)', 'মেডিকেল ও ডেন্টাল ভর্তি (এমবিবিএস/বিডিএস)', 'medical', null, 180),
  ('gst-cluster', 'GST', 'GST Cluster (General and Science & Technology Universities)', 'জিএসটি গুচ্ছ (সাধারণ ও বিজ্ঞান-প্রযুক্তি বিশ্ববিদ্যালয়)', 'cluster', null, 190)
on conflict (slug) do nothing;

-- Exam targets ----------------------------------------------------------------
-- Generic unit templates applied to universities that admit by faculty group.
with unit_templates (suffix, name_en, name_bn, description_en, description_bn, format_en, format_bn, sort_offset) as (
  values
    ('science', 'Science unit', 'বিজ্ঞান ইউনিট',
     'Admission test for science-group faculties.', 'বিজ্ঞান শাখার অনুষদগুলোর ভর্তি পরীক্ষা।',
     'Usually MCQ, sometimes with a written part. Confirm marks, time and sections in the official circular.',
     'সাধারণত এমসিকিউ, কখনো লিখিত অংশসহ। নম্বর, সময় ও বিভাগ অফিশিয়াল সার্কুলারে মিলিয়ে নিন।', 1),
    ('humanities', 'Arts & humanities unit', 'মানবিক ইউনিট',
     'Admission test for arts, humanities and social science faculties.', 'কলা, মানবিক ও সামাজিক বিজ্ঞান অনুষদের ভর্তি পরীক্ষা।',
     'Usually MCQ, sometimes with a written part. Confirm marks, time and sections in the official circular.',
     'সাধারণত এমসিকিউ, কখনো লিখিত অংশসহ। নম্বর, সময় ও বিভাগ অফিশিয়াল সার্কুলারে মিলিয়ে নিন।', 2),
    ('business', 'Business studies unit', 'ব্যবসায় শিক্ষা ইউনিট',
     'Admission test for business studies faculties.', 'ব্যবসায় শিক্ষা অনুষদের ভর্তি পরীক্ষা।',
     'Usually MCQ, sometimes with a written part. Confirm marks, time and sections in the official circular.',
     'সাধারণত এমসিকিউ, কখনো লিখিত অংশসহ। নম্বর, সময় ও বিভাগ অফিশিয়াল সার্কুলারে মিলিয়ে নিন।', 3)
)
insert into public.exam_targets (university_id, slug, name_en, name_bn, description_en, description_bn, typical_format_en, typical_format_bn, sort_order)
select u.id, u.slug || '-' || t.suffix, t.name_en, t.name_bn, t.description_en, t.description_bn, t.format_en, t.format_bn,
       u.sort_order * 10 + t.sort_offset
from public.universities u
cross join unit_templates t
where u.slug in ('du', 'ru', 'cu', 'ju', 'jnu', 'iu', 'ku', 'gst-cluster')
on conflict (slug) do nothing;

with single_targets (university_slug, slug, name_en, name_bn, description_en, description_bn, format_en, format_bn) as (
  values
    ('buet', 'buet-engineering', 'Engineering & architecture', 'প্রকৌশল ও স্থাপত্য',
     'Admission test for engineering, architecture and urban planning programmes.', 'প্রকৌশল, স্থাপত্য ও নগর পরিকল্পনা প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Problem-solving in physics, chemistry and mathematics; the exact structure is announced in each year''s circular.',
     'পদার্থবিজ্ঞান, রসায়ন ও গণিতে সমস্যা সমাধান; প্রতি বছরের সার্কুলারে কাঠামো ঘোষণা করা হয়।'),
    ('kuet', 'kuet-engineering', 'Engineering admission', 'প্রকৌশল ভর্তি',
     'Admission test for engineering programmes.', 'প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Physics, chemistry and mathematics. Check whether a combined engineering test applies this year.',
     'পদার্থবিজ্ঞান, রসায়ন ও গণিত। এ বছর সমন্বিত প্রকৌশল পরীক্ষা হচ্ছে কি না দেখে নিন।'),
    ('cuet', 'cuet-engineering', 'Engineering admission', 'প্রকৌশল ভর্তি',
     'Admission test for engineering programmes.', 'প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Physics, chemistry and mathematics. Check whether a combined engineering test applies this year.',
     'পদার্থবিজ্ঞান, রসায়ন ও গণিত। এ বছর সমন্বিত প্রকৌশল পরীক্ষা হচ্ছে কি না দেখে নিন।'),
    ('ruet', 'ruet-engineering', 'Engineering admission', 'প্রকৌশল ভর্তি',
     'Admission test for engineering programmes.', 'প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Physics, chemistry and mathematics. Check whether a combined engineering test applies this year.',
     'পদার্থবিজ্ঞান, রসায়ন ও গণিত। এ বছর সমন্বিত প্রকৌশল পরীক্ষা হচ্ছে কি না দেখে নিন।'),
    ('butex', 'butex-engineering', 'Textile engineering admission', 'টেক্সটাইল প্রকৌশল ভর্তি',
     'Admission test for textile engineering programmes.', 'টেক্সটাইল প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Physics, chemistry and mathematics; confirm the format in the official circular.',
     'পদার্থবিজ্ঞান, রসায়ন ও গণিত; ধরন অফিশিয়াল সার্কুলারে মিলিয়ে নিন।'),
    ('sust', 'sust-science', 'Science & engineering', 'বিজ্ঞান ও প্রকৌশল',
     'Admission test for science and engineering programmes.', 'বিজ্ঞান ও প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Usually MCQ. Check whether the university is admitting through a cluster this year.',
     'সাধারণত এমসিকিউ। এ বছর গুচ্ছের মাধ্যমে ভর্তি হচ্ছে কি না দেখে নিন।'),
    ('mbstu', 'mbstu-science', 'Science & engineering', 'বিজ্ঞান ও প্রকৌশল',
     'Admission test for science and engineering programmes.', 'বিজ্ঞান ও প্রকৌশল প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Usually MCQ. Check whether the university is admitting through a cluster this year.',
     'সাধারণত এমসিকিউ। এ বছর গুচ্ছের মাধ্যমে ভর্তি হচ্ছে কি না দেখে নিন।'),
    ('hstu', 'hstu-science', 'Science & agriculture', 'বিজ্ঞান ও কৃষি',
     'Admission test for science, engineering and agriculture programmes.', 'বিজ্ঞান, প্রকৌশল ও কৃষি প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Usually MCQ. Check whether the university is admitting through a cluster this year.',
     'সাধারণত এমসিকিউ। এ বছর গুচ্ছের মাধ্যমে ভর্তি হচ্ছে কি না দেখে নিন।'),
    ('pstu', 'pstu-science', 'Science & agriculture', 'বিজ্ঞান ও কৃষি',
     'Admission test for science, engineering and agriculture programmes.', 'বিজ্ঞান, প্রকৌশল ও কৃষি প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Usually MCQ. Check whether the university is admitting through a cluster this year.',
     'সাধারণত এমসিকিউ। এ বছর গুচ্ছের মাধ্যমে ভর্তি হচ্ছে কি না দেখে নিন।'),
    ('bau', 'bau-agriculture', 'Agriculture admission', 'কৃষি ভর্তি',
     'Admission test for agriculture and related programmes.', 'কৃষি ও সংশ্লিষ্ট প্রোগ্রামের ভর্তি পরীক্ষা।',
     'Usually MCQ, often through the agricultural universities'' cluster. Confirm in the official circular.',
     'সাধারণত এমসিকিউ, প্রায়ই কৃষি গুচ্ছের মাধ্যমে। অফিশিয়াল সার্কুলারে মিলিয়ে নিন।'),
    ('medical', 'medical-mbbs-bds', 'MBBS & BDS admission', 'এমবিবিএস ও বিডিএস ভর্তি',
     'National admission test for government and private medical and dental colleges.', 'সরকারি ও বেসরকারি মেডিকেল ও ডেন্টাল কলেজের জাতীয় ভর্তি পরীক্ষা।',
     'MCQ with negative marking. Confirm marks, time and the subject breakdown in the official circular.',
     'নেগেটিভ মার্কিংসহ এমসিকিউ। নম্বর, সময় ও বিষয়ভিত্তিক বণ্টন অফিশিয়াল সার্কুলারে মিলিয়ে নিন।')
)
insert into public.exam_targets (university_id, slug, name_en, name_bn, description_en, description_bn, typical_format_en, typical_format_bn, sort_order)
select u.id, s.slug, s.name_en, s.name_bn, s.description_en, s.description_bn, s.format_en, s.format_bn, u.sort_order * 10 + 1
from single_targets s
join public.universities u on u.slug = s.university_slug
on conflict (slug) do nothing;

-- Subjects per target (by slug suffix / explicit slug) -------------------------
with mapping (target_pattern, subject_slug) as (
  values
    ('%-science', 'physics'), ('%-science', 'chemistry'), ('%-science', 'higher-mathematics'),
    ('%-science', 'biology'), ('%-science', 'english'),
    ('%-humanities', 'bangla'), ('%-humanities', 'english'), ('%-humanities', 'general-knowledge'),
    ('%-business', 'accounting'), ('%-business', 'business-management'), ('%-business', 'finance-banking'),
    ('%-business', 'bangla'), ('%-business', 'english'),
    ('%-engineering', 'physics'), ('%-engineering', 'chemistry'), ('%-engineering', 'higher-mathematics'),
    ('%-engineering', 'english'),
    ('%-agriculture', 'physics'), ('%-agriculture', 'chemistry'), ('%-agriculture', 'biology'),
    ('%-agriculture', 'higher-mathematics'), ('%-agriculture', 'english'),
    ('medical-mbbs-bds', 'biology'), ('medical-mbbs-bds', 'chemistry'), ('medical-mbbs-bds', 'physics'),
    ('medical-mbbs-bds', 'english'), ('medical-mbbs-bds', 'general-knowledge')
)
insert into public.exam_target_subjects (exam_target_id, subject_id)
select t.id, s.id
from mapping m
join public.exam_targets t on t.slug like m.target_pattern
join public.subjects s on s.slug = m.subject_slug
on conflict do nothing;
