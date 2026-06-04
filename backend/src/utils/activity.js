async function logActivity(connection, options = {}) {
  const {
    userId = null,
    entityType,
    entityId,
    action,
    description = null
  } = options;

  if (!entityType || !entityId || !action) {
    return;
  }

  try {
    await connection.query(
      `
      INSERT INTO activity_logs (
        user_id,
        entity_type,
        entity_id,
        action,
        description
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, entityType, entityId, action, description]
    );
  } catch (error) {
    // Logging should never break primary flows.
    console.error('Failed to write activity log:', error.message);
  }
}

module.exports = {
  logActivity
};
