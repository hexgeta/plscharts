-- Add unique constraint to plsx_holders table to prevent duplicate address/date combinations

-- First, remove duplicates by keeping only the latest entry for each address/date combination
DELETE FROM plsx_holders a USING (
  SELECT MIN(id) as id, address, date
  FROM plsx_holders 
  GROUP BY address, date HAVING COUNT(*) > 1
) b
WHERE a.address = b.address AND a.date = b.date AND a.id > b.id;

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_plsx_holders_unique_address_date 
ON plsx_holders(address, date);

-- Add comment
COMMENT ON INDEX idx_plsx_holders_unique_address_date IS 'Ensures each address can only appear once per date in plsx_holders table'; 