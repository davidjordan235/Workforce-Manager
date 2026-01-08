import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgentInput, getRandomAgentColor } from "@/types/agent";

// Agent type from database
export type Agent = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hireDate: string;
  isActive: boolean;
  displayOrder: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

// Fetch all agents from API
async function fetchAgents(search?: string): Promise<Agent[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const response = await fetch(`/api/agents?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch agents");
  }
  return response.json();
}

// Fetch single agent from API
async function fetchAgent(id: string): Promise<Agent | null> {
  const response = await fetch(`/api/agents/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch agent");
  }
  return response.json();
}

// Create a new agent via API
async function createAgent(data: AgentInput): Promise<Agent> {
  const response = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      color: data.color || getRandomAgentColor(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create agent");
  }

  return response.json();
}

// Update an agent via API
async function updateAgent({
  id,
  data,
}: {
  id: string;
  data: Partial<AgentInput>;
}): Promise<Agent> {
  const response = await fetch(`/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update agent");
  }

  return response.json();
}

// Delete an agent via API (soft delete)
async function deleteAgent(id: string): Promise<void> {
  const response = await fetch(`/api/agents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete agent");
  }
}

// Reorder agents via API
async function reorderAgents(orderedIds: string[]): Promise<void> {
  const response = await fetch("/api/agents/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to reorder agents");
  }
}

// Hook to fetch agents
export function useAgents(search?: string) {
  return useQuery({
    queryKey: ["agents", search],
    queryFn: () => fetchAgents(search),
  });
}

// Hook to fetch single agent
export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: () => fetchAgent(id),
    enabled: !!id,
  });
}

// Hook to create agent
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// Hook to update agent
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", data.id] });
    },
  });
}

// Hook to delete agent
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// Hook to reorder agents
export function useReorderAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderAgents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}
