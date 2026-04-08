-- Adds columns to store Proof of Payment for Orders
-- Table name is mapped as @@map("orders") in prisma/schema.prisma
ALTER TABLE orders
  ADD COLUMN paymentProofFileName VARCHAR(255) NULL,
  ADD COLUMN paymentProofMimeType VARCHAR(255) NULL,
  ADD COLUMN paymentProofDataUrl LONGTEXT NULL;

