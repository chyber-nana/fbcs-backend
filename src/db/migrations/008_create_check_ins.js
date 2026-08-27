/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('check_ins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('ticket_id').notNullable().references('id').inTable('tickets').onDelete('CASCADE').unique();
    table.uuid('checked_in_by').notNullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('checked_in_at').notNullable().defaultTo(knex.fn.now());
    table.string('device_info', 255);
    table.index('ticket_id');
    table.index('checked_in_by');
    table.index('checked_in_at');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('check_ins');
}
