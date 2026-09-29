-- Runtime operational privileges; existing D1 bindings and historical schemas remain untouched.
GRANT SELECT, INSERT, UPDATE ON growth_setting, referral, growth_campaign, growth_action TO bosku_app;
GRANT EXECUTE ON FUNCTION award_haircut(text,text,text), redeem_haircut(text,text) TO bosku_app;
