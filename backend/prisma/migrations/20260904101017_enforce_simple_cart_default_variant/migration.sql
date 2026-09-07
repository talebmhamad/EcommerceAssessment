-- Simple products must use their existing default variant when added to cart.
CREATE FUNCTION enforce_cart_item_variant_rules()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "products" AS "p"
        INNER JOIN "product_variants" AS "v"
            ON "v"."product_id" = "p"."id"
            AND "v"."id" = NEW."variant_id"
        WHERE "p"."id" = NEW."product_id"
            AND "p"."type" = 'SIMPLE'
            AND "v"."is_default" = false
    ) THEN
        RAISE EXCEPTION 'Simple products must use their default variant.'
            USING ERRCODE = '23514',
            CONSTRAINT = 'cart_items_simple_default_variant_check';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cart_items_variant_rules_trigger
BEFORE INSERT OR UPDATE OF "product_id", "variant_id"
ON "cart_items"
FOR EACH ROW
EXECUTE FUNCTION enforce_cart_item_variant_rules();
