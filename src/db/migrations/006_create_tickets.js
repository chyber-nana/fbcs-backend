/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('tickets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('ticket_type_id').notNullable().references('id').inTable('ticket_types').onDelete('CASCADE');
    table.string('ticket_number', 50).notNullable().unique();
    table.string('qr_token', 255).notNullable().unique();
    table.enum('status', ['active', 'cancelled', 'refunded', 'used']).notNullable().defaultTo('active');
    table.timestamps(true, true);
    table.index('order_id');
    table.index('user_id');
    table.index('ticket_type_id');
    table.index('ticket_number');
    table.index('qr_token');
    table.index('status');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('tickets');
}
