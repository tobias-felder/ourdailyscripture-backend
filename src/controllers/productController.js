const pool = require('../config/database');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { type, isActive } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error fetching products' });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error fetching product' });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const {
      productId,
      name,
      type,
      description,
      price,
      salePrice,
      onSale,
      category,
      imageUrl,
      printifyProductId,
      metadata
    } = req.body;

    // Validate required fields
    if (!productId || !name || !type || !price) {
      return res.status(400).json({ 
        error: 'Please provide productId, name, type, and price' 
      });
    }

    // Check if product ID already exists
    const existing = await pool.query(
      'SELECT * FROM products WHERE product_id = $1',
      [productId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Product ID already exists' });
    }

    const result = await pool.query(
      `INSERT INTO products (
        product_id, name, type, description, price, sale_price, on_sale,
        category, image_url, printify_product_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        productId,
        name,
        type,
        description || null,
        price,
        salePrice || null,
        onSale || false,
        category || null,
        imageUrl || null,
        printifyProductId || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.json({
      success: true,
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error creating product' });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      salePrice,
      onSale,
      category,
      imageUrl,
      isActive,
      metadata
    } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           sale_price = COALESCE($4, sale_price),
           on_sale = COALESCE($5, on_sale),
           category = COALESCE($6, category),
           image_url = COALESCE($7, image_url),
           is_active = COALESCE($8, is_active),
           metadata = COALESCE($9, metadata)
       WHERE id = $10
       RETURNING *`,
      [
        name,
        description,
        price,
        salePrice,
        onSale,
        category,
        imageUrl,
        isActive,
        metadata ? JSON.stringify(metadata) : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error updating product' });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error deleting product' });
  }
};

// Sync products from frontend data (one-time import)
exports.syncProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    const imported = [];
    const skipped = [];

    for (const product of products) {
      try {
        // Check if product already exists
        const existing = await pool.query(
          'SELECT * FROM products WHERE product_id = $1',
          [product.id]
        );

        if (existing.rows.length > 0) {
          skipped.push(product.id);
          continue;
        }

        // Insert product
        await pool.query(
          `INSERT INTO products (
            product_id, name, type, description, price, sale_price, on_sale,
            category, image_url, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            product.id,
            product.name,
            product.type || 'bracelet',
            product.description || null,
            product.price,
            product.salePrice || null,
            product.onSale || false,
            product.category || null,
            product.images?.[0] || null,
            JSON.stringify({
              verse: product.verse,
              verseText: product.verseText,
              colors: product.colors,
              features: product.features
            })
          ]
        );

        imported.push(product.id);
      } catch (error) {
        console.error(`Error importing product ${product.id}:`, error);
        skipped.push(product.id);
      }
    }

    res.json({
      success: true,
      message: 'Products synced successfully',
      imported: imported.length,
      skipped: skipped.length,
      details: { imported, skipped }
    });
  } catch (error) {
    console.error('Sync products error:', error);
    res.status(500).json({ error: 'Server error syncing products' });
  }
};

