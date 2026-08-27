/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.string('payment_reference', 255).notNullable().unique();
    table.string('provider', 50).notNullable().defaultTo('paystack');
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 10).notNullable().defaultTo('GHS');
    table.enum('status', ['pending', 'success', 'failed']).notNullable().defaultTo('pending');
    table.timestamp('paid_at');
    table.jsonb('raw_response');
    table.timestamps(true, true);
    table.index('order_id');
    table.index('payment_reference');
    table.index('status');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('payments');
}
