import { TaskBoardClient } from "@/components/task-board-client";
import { listTasks } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return <TaskBoardClient initialTasks={listTasks()} />;
}
