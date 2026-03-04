import Task from "../models/task.js"

export const createTask =async(req,res)=>{
    try{
        const {title,description,assignedTo,dueDate,priority} = req.body;

        if(!title || !assignedTo){
            res.status(400).json({messgae:"Title and AssignedTo are required"});
        }

        const task = await Task.create({
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            assignedBy: req.user.userId
        });

        res.status(201).json({messgae:"Task created sucessfully",task});

    }
    catch(error){
        res.status(500).json({messgae:"Failed to create task",error:error.messgae});
    }

}



export const getAllTasks = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "employee") {
      query = { assignedTo: req.user.userId };
    }

    // Fix: Populate 'assignedTo' and 'assignedBy' to get names/emails instead of just IDs
    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 }); // Show newest tasks first

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name");

    if (!task) return res.status(404).json({ message: "Task not found" });
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateTask = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // employee can update only their task
    if (
      req.user.role === "employee" &&
      task.assignedTo.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = status;
    await task.save();

    res.json({
      success: true,
      task
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only Admin or HR can delete
    if (req.user.role === "employee") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
