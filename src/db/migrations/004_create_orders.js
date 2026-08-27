/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    table.string('order_reference', 100).notNullable().unique();
    table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    table.string('currency', 10).notNullable().defaultTo('GHS');
    table.enum('status', ['pending', 'paid', 'failed', 'cancelled', 'refunded']).notNullable().defaultTo('pending');
    table.timestamps(true, true);
    table.index('user_id');
    table.index('event_id');
    table.index('status');
    table.index('order_reference');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('orders');
}
