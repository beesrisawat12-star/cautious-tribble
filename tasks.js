const TASKS = {
  STORAGE_KEY: 'mango_ai_tasks',

  getAll: function() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save: function(taskData) {
    const list = this.getAll();
    if (!taskData.id) {
      taskData.id = 'task_' + Date.now();
      taskData.completed = false;
      taskData.createdAt = new Date().toISOString();
      list.push(taskData);
    } else {
      const index = list.findIndex(item => item.id === taskData.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...taskData };
      }
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    return taskData;
  },

  toggleComplete: function(id) {
    const list = this.getAll();
    const task = list.find(item => item.id === id);
    if (task) {
      task.completed = !task.completed;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    }
  },

  delete: function(id) {
    let list = this.getAll();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  }
};

window.TASKS = TASKS;
