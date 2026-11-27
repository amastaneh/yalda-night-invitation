DROP TRIGGER party_choice_limits;
CREATE TRIGGER party_choice_limits BEFORE INSERT ON party_gift_choices
WHEN NOT EXISTS(SELECT 1 FROM party_gift_choices WHERE household_id=NEW.household_id AND kind=NEW.kind)
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM party_gift_choices WHERE household_id=NEW.household_id)>=2
    THEN RAISE(ABORT,'party_choice_limit') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM party_gift_choices WHERE event_id=NEW.event_id AND kind=NEW.kind)>=
    CASE NEW.kind WHEN 'pin' THEN 1 WHEN 'pastry' THEN 4 WHEN 'pomegranate' THEN 5 ELSE 20 END
    THEN RAISE(ABORT,'party_choice_capacity') END;
END;
