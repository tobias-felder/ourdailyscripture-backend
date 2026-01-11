const OpenAI = require('openai');
const pool = require('../config/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate contextual prayers based on verses and topic
 * POST /api/prayers/generate
 */
exports.generatePrayers = async (req, res) => {
  try {
    const { category, subcategory, verses, length = 'medium' } = req.body;

    if (!category || !verses || verses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category and verses are required'
      });
    }

    // Build context from verses
    const versesContext = verses.map(v => 
      `${v.reference}: "${v.text}"`
    ).join('\n\n');

    // Define prayer length specifications
    const lengthSpecs = {
      short: '1-2 sentences',
      medium: '3-5 sentences',
      long: '7-10 sentences',
      extended: 'a full paragraph (10-15 sentences)'
    };
    
    const prayerLength = lengthSpecs[length] || lengthSpecs.medium;

    // Create a focused prompt to minimize hallucination
    const prompt = `You are a Christian prayer writer helping believers pray Scripture-based prayers.

CONTEXT:
Topic: ${category}${subcategory ? ` - ${subcategory}` : ''}

SCRIPTURE VERSES:
${versesContext}

TASK: Generate 5 distinct prayers based ONLY on these specific verses and their themes. Each prayer should:
1. Reference the actual verses provided
2. Use biblical language and themes from these verses
3. Be heartfelt and personal
4. Address the specific topic: ${category}${subcategory ? ` - ${subcategory}` : ''}
5. Be ${prayerLength} long

PRAYER STYLES TO CREATE:
1. Prayer for Peace and Comfort
2. Prayer for Strength and Courage
3. Prayer for Guidance and Wisdom
4. Prayer for Faith and Trust
5. Prayer of Thanksgiving and Praise

FORMAT: Return ONLY a JSON array with this structure:
[
  {
    "title": "Prayer for Peace and Comfort",
    "prayer": "The actual prayer text here...",
    "style": "comfort"
  },
  ...
]

IMPORTANT: Base every prayer directly on the verses provided. Do not add theological concepts not present in these verses.`;

    // Generate prayers using GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a Christian prayer writer who creates Scripture-based prayers. You always base prayers directly on the verses provided and never add concepts not found in those verses."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const prayersText = response.choices[0].message.content;
    
    // Parse the JSON response
    let prayers;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = prayersText.match(/```json\n([\s\S]*?)\n```/) || 
                       prayersText.match(/```\n([\s\S]*?)\n```/) ||
                       [null, prayersText];
      prayers = JSON.parse(jsonMatch[1] || prayersText);
    } catch (parseError) {
      console.error('Failed to parse prayer JSON:', parseError);
      // Fallback: return raw text
      prayers = [{
        title: "Generated Prayer",
        prayer: prayersText,
        style: "general"
      }];
    }

    // Save prayers to database for future reference
    try {
      for (const prayer of prayers) {
        await pool.query(
          `INSERT INTO prayers (category, subcategory, title, prayer_text, style, verses_used)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            category,
            subcategory || null,
            prayer.title,
            prayer.prayer,
            prayer.style,
            JSON.stringify(verses.map(v => v.reference))
          ]
        );
      }
    } catch (dbError) {
      console.error('Failed to save prayers to database:', dbError);
      // Continue anyway - prayers are still returned
    }

    res.json({
      success: true,
      category,
      subcategory,
      length,
      prayers,
      verses_used: verses.map(v => v.reference)
    });

  } catch (error) {
    console.error('Error generating prayers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prayers',
      details: error.message
    });
  }
};

/**
 * Get saved prayers by category
 * GET /api/prayers/:category
 */
exports.getPrayersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory } = req.query;

    let query = `
      SELECT id, category, subcategory, title, prayer_text, style, verses_used, created_at
      FROM prayers
      WHERE category = $1
    `;
    const params = [category];

    if (subcategory) {
      query += ` AND subcategory = $2`;
      params.push(subcategory);
    }

    query += ` ORDER BY created_at DESC LIMIT 20`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      category,
      subcategory: subcategory || null,
      prayers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching prayers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prayers',
      details: error.message
    });
  }
};

/**
 * Get a random prayer by category
 * GET /api/prayers/:category/random
 */
exports.getRandomPrayer = async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory } = req.query;

    let query = `
      SELECT id, category, subcategory, title, prayer_text, style, verses_used, created_at
      FROM prayers
      WHERE category = $1
    `;
    const params = [category];

    if (subcategory) {
      query += ` AND subcategory = $2`;
      params.push(subcategory);
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No prayers found for this category'
      });
    }

    res.json({
      success: true,
      prayer: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching random prayer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch random prayer',
      details: error.message
    });
  }
};

/**
 * Get all prayer categories with counts
 * GET /api/prayers/categories/all
 */
exports.getPrayerCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        subcategory,
        COUNT(*) as prayer_count
      FROM prayers
      GROUP BY category, subcategory
      ORDER BY category, subcategory
    `);

    res.json({
      success: true,
      categories: result.rows
    });

  } catch (error) {
    console.error('Error fetching prayer categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prayer categories',
      details: error.message
    });
  }
};
