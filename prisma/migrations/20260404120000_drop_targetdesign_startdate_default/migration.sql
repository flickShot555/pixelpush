-- Drop the DEFAULT on TargetDesign.startDate (this was previously in an out-of-order migration)
ALTER TABLE "TargetDesign" ALTER COLUMN "startDate" DROP DEFAULT;
