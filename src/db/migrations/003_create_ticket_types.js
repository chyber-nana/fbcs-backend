/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('ticket_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('price', 12, 2).notNullable().defaultTo(0);
    table.integer('quantity_available').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.index('event_id');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('ticket_types');
}
