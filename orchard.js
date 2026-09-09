const ORCHARDS = {
  STORAGE_KEY: 'mango_ai_orchards',
  TABLE: 'orchards',

  async getCurrentUser() {
    if (!window.supabaseClient?.auth) return null;
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error) {
      console.warn('Unable to get current user:', error.message);
      return null;
    }
    return data?.user || null;
  },

  async getAll() {
    const user = await this.getCurrentUser();
    if (!user || !window.supabaseClient) return [];

    const { data, error } = await window.supabaseClient
      .from(this.TABLE)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load orchards:', error.message);
      return [];
    }
    return (data || []).map(row => this.fromDb(row));
  },

  async getById(id) {
    const user = await this.getCurrentUser();
    if (!user || !window.supabaseClient) return null;

    const { data, error } = await window.supabaseClient
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load orchard:', error.message);
      return null;
    }
    return data ? this.fromDb(data) : null;
  },

  async save(orchardData) {
    const user = await this.getCurrentUser();
    if (!user || !window.supabaseClient) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูลสวน');
    }

    const payload = this.toDb(orchardData, user.id);
    let result;

    if (orchardData.id) {
      const { data, error } = await window.supabaseClient
        .from(this.TABLE)
        .update(payload)
        .eq('id', orchardData.id)
        .eq('user_id', user.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await window.supabaseClient
        .from(this.TABLE)
        .insert(payload)
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Failed to save orchard:', result.error.message);
      throw result.error;
    }
    return this.fromDb(result.data);
  },

  async delete(id) {
    const user = await this.getCurrentUser();
    if (!user || !window.supabaseClient) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนลบข้อมูลสวน');
    }

    const { error } = await window.supabaseClient
      .from(this.TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete orchard:', error.message);
      throw error;
    }
  },

  toDb(data, userId) {
    const known = new Set(['id', 'name', 'area', 'tree_count', 'trees', 'location', 'metadata', 'created_at', 'updated_at', 'createdAt', 'updatedAt']);
    const metadata = { ...(data.metadata || {}) };
    Object.keys(data || {}).forEach(key => {
      if (!known.has(key)) metadata[key] = data[key];
    });

    return {
      ...(data.id ? { id: data.id } : {}),
      user_id: userId,
      name: data.name || 'สวนมะม่วง',
      area: this.toNumber(data.area),
      tree_count: this.toNumber(data.tree_count ?? data.trees),
      location: typeof data.location === 'object' ? (data.location || null) : (data.location ? { name: data.location } : null),
      metadata
    };
  },

  fromDb(row) {
    return {
      ...row.metadata,
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      area: row.area,
      trees: row.tree_count,
      tree_count: row.tree_count,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata || {}
    };
  },

  toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  },

  async init() {
    const user = await this.getCurrentUser();
    if (!user) {
      console.log('ORCHARDS module waiting for authenticated user.');
      return;
    }

    const orchards = await this.getAll();
    console.log(`ORCHARDS module initialized for user ${user.id}. ${orchards.length} orchard(s) loaded from Supabase.`);
  }
};

window.ORCHARDS = ORCHARDS;
