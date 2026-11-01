ALTER TABLE inquiries ADD COLUMN subject TEXT NOT NULL DEFAULT '';

UPDATE inquiries
SET subject = topic || ' 문의'
WHERE subject = '';