const pool = require('../config/database');

// Predefined theme presets
const themePresets = {
  default: {
    name: 'Default (Purple & Pink)',
    primary: '#9333ea',
    secondary: '#ec4899',
    accent: '#eff6ff',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
  },
  christmas: {
    name: 'Christmas (Red & Gold)',
    primary: '#dc2626',
    secondary: '#f59e0b',
    accent: '#fef3c7',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)'
  },
  easter: {
    name: 'Easter (Pastels)',
    primary: '#f9a8d4',
    secondary: '#c4b5fd',
    accent: '#d1fae5',
    gradient: 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)'
  },
  summer: {
    name: 'Summer (Bright Blue & Coral)',
    primary: '#0ea5e9',
    secondary: '#fb7185',
    accent: '#fef9c3',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #fb7185 100%)'
  },
  fall: {
    name: 'Fall (Orange & Brown)',
    primary: '#f97316',
    secondary: '#92400e',
    accent: '#fef3c7',
    gradient: 'linear-gradient(135deg, #f97316 0%, #92400e 100%)'
  },
  valentines: {
    name: "Valentine's (Red & Pink)",
    primary: '#dc2626',
    secondary: '#ec4899',
    accent: '#fce7f3',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)'
  }
};

// Get current theme
exports.getCurrentTheme = async (req, res) => {
  try {
    // Check if theme settings table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'theme_settings'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create theme_settings table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS theme_settings (
          id SERIAL PRIMARY KEY,
          theme_name VARCHAR(50) NOT NULL,
          primary_color VARCHAR(20) NOT NULL,
          secondary_color VARCHAR(20) NOT NULL,
          accent_color VARCHAR(20) NOT NULL,
          gradient TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert default theme
      await pool.query(`
        INSERT INTO theme_settings (theme_name, primary_color, secondary_color, accent_color, gradient)
        VALUES ('default', '#9333ea', '#ec4899', '#eff6ff', 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)')
      `);
    }

    // Get active theme
    const result = await pool.query(
      'SELECT * FROM theme_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      // Return default theme if none is active
      return res.json({
        success: true,
        theme: {
          themeName: 'default',
          ...themePresets.default
        }
      });
    }

    const theme = result.rows[0];
    res.json({
      success: true,
      theme: {
        themeName: theme.theme_name,
        name: themePresets[theme.theme_name]?.name || theme.theme_name,
        primary: theme.primary_color,
        secondary: theme.secondary_color,
        accent: theme.accent_color,
        gradient: theme.gradient
      }
    });
  } catch (error) {
    console.error('Get theme error:', error);
    res.status(500).json({ error: 'Server error fetching theme' });
  }
};

// Get all theme presets
exports.getThemePresets = async (req, res) => {
  try {
    const presets = Object.keys(themePresets).map(key => ({
      id: key,
      ...themePresets[key]
    }));

    res.json({ success: true, presets });
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Server error fetching theme presets' });
  }
};

// Apply theme preset
exports.applyTheme = async (req, res) => {
  try {
    const { themeName } = req.body;

    if (!themePresets[themeName]) {
      return res.status(400).json({ error: 'Invalid theme name' });
    }

    const theme = themePresets[themeName];

    // Deactivate all themes
    await pool.query('UPDATE theme_settings SET is_active = false');

    // Insert new active theme
    const result = await pool.query(
      `INSERT INTO theme_settings (theme_name, primary_color, secondary_color, accent_color, gradient, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [themeName, theme.primary, theme.secondary, theme.accent, theme.gradient]
    );

    res.json({
      success: true,
      message: `Theme changed to ${theme.name}`,
      theme: {
        themeName,
        ...theme
      }
    });
  } catch (error) {
    console.error('Apply theme error:', error);
    res.status(500).json({ error: 'Server error applying theme' });
  }
};

// Apply custom theme
exports.applyCustomTheme = async (req, res) => {
  try {
    const { primary, secondary, accent } = req.body;

    if (!primary || !secondary || !accent) {
      return res.status(400).json({ 
        error: 'Please provide primary, secondary, and accent colors' 
      });
    }

    const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

    // Deactivate all themes
    await pool.query('UPDATE theme_settings SET is_active = false');

    // Insert new custom theme
    const result = await pool.query(
      `INSERT INTO theme_settings (theme_name, primary_color, secondary_color, accent_color, gradient, is_active)
       VALUES ('custom', $1, $2, $3, $4, true)
       RETURNING *`,
      [primary, secondary, accent, gradient]
    );

    res.json({
      success: true,
      message: 'Custom theme applied successfully',
      theme: {
        themeName: 'custom',
        name: 'Custom Theme',
        primary,
        secondary,
        accent,
        gradient
      }
    });
  } catch (error) {
    console.error('Apply custom theme error:', error);
    res.status(500).json({ error: 'Server error applying custom theme' });
  }
};

