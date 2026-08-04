-- Baseline schema for order-service (pharmalink_orders), hand-derived from
-- model/DrugOrder.java's JPA annotations, including its @ElementCollection
-- (items) join table for the @Embeddable OrderItem. No live Postgres/matching
-- Java version was available in this sandbox to pg_dump a real schema from
-- — see MICROSERVICES_PLAN.md Phase 2 step 9.
CREATE TABLE drug_orders (
    id                 VARCHAR(255) NOT NULL,
    user_id            VARCHAR(255) NOT NULL,
    total_amount       DOUBLE PRECISION NOT NULL,
    delivery_address   VARCHAR(255),
    payment_method     VARCHAR(255),
    order_status       VARCHAR(255),
    payment_status     VARCHAR(255),
    created_at         TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE order_items (
    order_id     VARCHAR(255) NOT NULL,
    drug_name    VARCHAR(255),
    quantity     INTEGER NOT NULL,
    unit_price   DOUBLE PRECISION NOT NULL
);
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES drug_orders (id);
