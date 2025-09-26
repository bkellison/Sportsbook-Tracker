class BaseRepository {
  constructor(database, tableName) {
    this.db = database;
    this.tableName = tableName;
  }

  async findById(id) {
    const connection = await this.db.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  async create(data) {
    const connection = await this.db.getConnection();
    try {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
        values
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  async update(id, data) {
    const connection = await this.db.getConnection();
    try {
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];

      await connection.execute(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
        values
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async delete(id) {
    const connection = await this.db.getConnection();
    try {
      const [result] = await connection.execute(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseRepository;