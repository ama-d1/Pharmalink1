-- New table backing SavedLocation.java — the address-book feature that
-- locationService.ts's frontend calls needed but that had no backend
-- support anywhere (see SavedLocation's class javadoc).
CREATE TABLE saved_locations (
    id              VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    city            VARCHAR(255),
    region          VARCHAR(255),
    country         VARCHAR(255),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE INDEX idx_saved_locations_user_id ON saved_locations (user_id);
