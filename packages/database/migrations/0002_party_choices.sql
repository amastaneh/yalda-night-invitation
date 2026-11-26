CREATE TABLE party_gift_choices (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('pomegranate','gift-card','pastry','pin')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(household_id,kind)
);
CREATE INDEX party_choices_event ON party_gift_choices(event_id,kind);
-- The checks execute in the same database transaction as insertion, including simultaneous requests.
CREATE TRIGGER party_choice_limits BEFORE INSERT ON party_gift_choices
WHEN NOT EXISTS(SELECT 1 FROM party_gift_choices WHERE household_id=NEW.household_id AND kind=NEW.kind)
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM party_gift_choices WHERE household_id=NEW.household_id)>=2
    THEN RAISE(ABORT,'party_choice_limit') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM party_gift_choices WHERE event_id=NEW.event_id AND kind=NEW.kind)>=
    CASE NEW.kind WHEN 'pin' THEN 1 WHEN 'pastry' THEN 3 WHEN 'pomegranate' THEN 4 ELSE 6 END
    THEN RAISE(ABORT,'party_choice_capacity') END;
END;
CREATE TABLE daily_fortunes (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  fortune_index INTEGER NOT NULL,
  PRIMARY KEY(household_id,day)
);
