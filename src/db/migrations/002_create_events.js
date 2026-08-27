/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('venue', 255);
    table.timestamp('event_date').notNullable();
    table.integer('capacity').notNullable().defaultTo(500);
    table.enum('status', ['draft', 'published', 'cancelled', 'completed']).notNullable().defaultTo('draft');
    table.timestamps(true, true);
    table.index('status');
    table.index('event_date');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('events');
}
