import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockAgents, MockAgent } from "@/lib/mock-data";
import { AgentInput, getRandomAgentColor } from "@/types/agent";

// In-memory store for mock data
let agents = [...mockAgents];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all agents (mock)
async function fetchAgents(search?: string): Promise<MockAgent[]> {
  await delay(300);

  let result = agents.filter(a => a.isActive);

  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(a =>
      a.firstName.toLowerCase().includes(searchLower) ||
      a.lastName.toLowerCase().includes(searchLower) ||
      a.email.toLowerCase().includes(searchLower) ||
      a.employeeId.toLowerCase().includes(searchLower)
    );
  }

  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

// Fetch single agent (mock)
async function fetchAgent(id: string): Promise<MockAgent | null> {
  await delay(200);
  return agents.find(a => a.id === id) || null;
}

// Create a new agent (mock)
async function createAgent(data: AgentInput): Promise<MockAgent> {
  await delay(300);

  // Check for duplicate employee ID
  const existingById = agents.find(a => a.employeeId === data.employeeId);
  if (existingById) {
    throw new Error("An agent with this employee ID already exists");
  }

  // Check for duplicate email
  const existingByEmail = agents.find(a => a.email === data.email);
  if (existingByEmail) {
    throw new Error("An agent with this email already exists");
  }

  const newAgent: MockAgent = {
    id: `agent-${Date.now()}`,
    employeeId: data.employeeId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || null,
    hireDate: new Date(data.hireDate),
    isActive: true,
    displayOrder: agents.length + 1,
    color: data.color || getRandomAgentColor(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  agents.push(newAgent);
  return newAgent;
}

// Update an agent (mock)
async function updateAgent({
  id,
  data,
}: {
  id: string;
  data: Partial<AgentInput>;
}): Promise<MockAgent> {
  await delay(300);

  const index = agents.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error("Agent not found");
  }

  // Check for duplicate employee ID
  if (data.employeeId && data.employeeId !== agents[index].employeeId) {
    const conflict = agents.find(a => a.employeeId === data.employeeId && a.id !== id);
    if (conflict) {
      throw new Error("An agent with this employee ID already exists");
    }
  }

  // Check for duplicate email
  if (data.email && data.email !== agents[index].email) {
    const conflict = agents.find(a => a.email === data.email && a.id !== id);
    if (conflict) {
      throw new Error("An agent with this email already exists");
    }
  }

  agents[index] = {
    ...agents[index],
    ...data,
    hireDate: data.hireDate ? new Date(data.hireDate) : agents[index].hireDate,
    updatedAt: new Date(),
  };

  return agents[index];
}

// Delete an agent (mock - soft delete)
async function deleteAgent(id: string): Promise<void> {
  await delay(300);

  const index = agents.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error("Agent not found");
  }

  // Soft delete
  agents[index].isActive = false;
}

// Reorder agents (mock)
async function reorderAgents(orderedIds: string[]): Promise<void> {
  await delay(200);

  orderedIds.forEach((id, index) => {
    const agentIndex = agents.findIndex(a => a.id === id);
    if (agentIndex !== -1) {
      agents[agentIndex].displayOrder = index + 1;
    }
  });
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
