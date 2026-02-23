import { neon } from '@netlify/neon';

export default async (req, context) => {
  try {
    let payload = {};

    // Parse form-urlencoded request body
    if (req.body && typeof req.body.getReader === 'function') {
      const bodyText = await req.text();
      const params = new URLSearchParams(bodyText);
      for (const [key, value] of params) {
        payload[key] = value;
      }
    }

    // Validate required fields
    const { human_name, email, biz_name, instagram, facebook, website, description } = payload;
    
    if (!human_name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await sql.query(
      `INSERT INTO makers (human_name, email, biz_name, instagram, facebook, website, description, approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
      [human_name, email, biz_name || null, instagram || null, facebook || null, website || null, description || null]
    );

    return new Response(JSON.stringify({ message: 'Maker added successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to add maker', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

