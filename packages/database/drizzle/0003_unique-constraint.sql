ALTER TABLE "bank_account" DROP CONSTRAINT "bank_account_account_no_unique";--> statement-breakpoint
ALTER TABLE "fcd_account" DROP CONSTRAINT "fcd_account_account_no_unique";--> statement-breakpoint
ALTER TABLE "personal_loan_account" DROP CONSTRAINT "personal_loan_account_account_no_unique";--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_bank_account_no_unique" UNIQUE("bank","account_no");--> statement-breakpoint
ALTER TABLE "bank_daily_balance" ADD CONSTRAINT "bank_daily_balance_bank_account_id_date_unique" UNIQUE("bank_account_id","date");--> statement-breakpoint
ALTER TABLE "fcd_account" ADD CONSTRAINT "fcd_account_bank_account_no_unique" UNIQUE("bank","account_no");--> statement-breakpoint
ALTER TABLE "investment_daily_balance" ADD CONSTRAINT "investment_daily_balance_investment_account_id_date_unique" UNIQUE("investment_account_id","date");--> statement-breakpoint
ALTER TABLE "personal_loan_account" ADD CONSTRAINT "personal_loan_account_issued_by_account_no_unique" UNIQUE("issued_by","account_no");