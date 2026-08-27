/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('phone', 50);
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['attendee', 'admin', 'staff']).notNullable().defaultTo('attendee');
    table.timestamps(true, true);
    table.index('email');
    table.index('role');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
}
