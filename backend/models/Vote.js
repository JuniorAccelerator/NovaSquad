const { pool } = require('../db/connection');

class Vote {
  // Get upvote and downvote counts for a drawing
  static async getVoteCounts(drawingId) {
    const query = `
      SELECT 
        vote_type,
        COUNT(*) as count 
      FROM votes 
      WHERE drawing_id = $1
      GROUP BY vote_type
    `;
    const result = await pool.query(query, [drawingId]);
    
    const counts = { upvotes: 0, downvotes: 0 };
    result.rows.forEach(row => {
      if (row.vote_type === 'upvote') {
        counts.upvotes = parseInt(row.count);
      } else if (row.vote_type === 'downvote') {
        counts.downvotes = parseInt(row.count);
      }
    });
    
    return counts;
  }

  // Get user's vote for a drawing
  static async getUserVote(drawingId, userId) {
    if (!userId) return null;
    const query = 'SELECT vote_type FROM votes WHERE drawing_id = $1 AND user_id = $2';
    const result = await pool.query(query, [drawingId, userId]);
    return result.rows.length > 0 ? result.rows[0].vote_type : null;
  }

  // Add or update a vote
  static async setVote(drawingId, userId, voteType) {
    if (!userId) {
      throw new Error('User ID is required to vote');
    }
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      throw new Error('Invalid vote type. Must be "upvote" or "downvote"');
    }

    // Check if user already voted
    const existingVote = await this.getUserVote(drawingId, userId);
    
    if (existingVote) {
      if (existingVote === voteType) {
        // Same vote type - remove the vote (toggle off)
        await this.removeVote(drawingId, userId);
        return { action: 'removed', voteType: null };
      } else {
        // Different vote type - update it
        const query = 'UPDATE votes SET vote_type = $1 WHERE drawing_id = $2 AND user_id = $3 RETURNING *';
        await pool.query(query, [voteType, drawingId, userId]);
        return { action: 'updated', voteType };
      }
    } else {
      // New vote
      const query = 'INSERT INTO votes (drawing_id, user_id, vote_type) VALUES ($1, $2, $3) RETURNING *';
      await pool.query(query, [drawingId, userId, voteType]);
      return { action: 'added', voteType };
    }
  }

  // Remove a vote
  static async removeVote(drawingId, userId) {
    if (!userId) {
      throw new Error('User ID is required to unvote');
    }

    const query = 'DELETE FROM votes WHERE drawing_id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [drawingId, userId]);
    return result.rows.length > 0;
  }

  // Get vote counts for multiple drawings
  static async getVoteCountsForDrawings(drawingIds) {
    if (!drawingIds || drawingIds.length === 0) {
      return {};
    }

    const query = `
      SELECT 
        drawing_id,
        vote_type,
        COUNT(*) as count 
      FROM votes 
      WHERE drawing_id = ANY($1::int[])
      GROUP BY drawing_id, vote_type
    `;
    const result = await pool.query(query, [drawingIds]);

    const counts = {};
    drawingIds.forEach(id => {
      counts[id] = { upvotes: 0, downvotes: 0 };
    });
    
    result.rows.forEach(row => {
      if (!counts[row.drawing_id]) {
        counts[row.drawing_id] = { upvotes: 0, downvotes: 0 };
      }
      if (row.vote_type === 'upvote') {
        counts[row.drawing_id].upvotes = parseInt(row.count);
      } else if (row.vote_type === 'downvote') {
        counts[row.drawing_id].downvotes = parseInt(row.count);
      }
    });

    return counts;
  }

  // Get user votes for multiple drawings
  static async getUserVotesForDrawings(drawingIds, userId) {
    if (!userId || !drawingIds || drawingIds.length === 0) {
      return {};
    }

    const query = `
      SELECT drawing_id, vote_type 
      FROM votes 
      WHERE drawing_id = ANY($1::int[]) AND user_id = $2
    `;
    const result = await pool.query(query, [drawingIds, userId]);

    const userVotes = {};
    drawingIds.forEach(id => {
      userVotes[id] = null;
    });
    result.rows.forEach(row => {
      userVotes[row.drawing_id] = row.vote_type;
    });

    return userVotes;
  }
}

module.exports = Vote;
