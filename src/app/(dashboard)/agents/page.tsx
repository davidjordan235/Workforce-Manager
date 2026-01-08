"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Users, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  Agent,
} from "@/hooks/useAgents";
import { AgentForm } from "@/components/features/agents/AgentForm";
import { AgentCard } from "@/components/features/agents/AgentCard";
import { AgentInput } from "@/types/agent";

export default function AgentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: agents, isLoading, error } = useAgents(searchQuery);
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  const handleCreate = async (data: AgentInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Agent added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add agent");
      throw error;
    }
  };

  const handleUpdate = async (data: AgentInput) => {
    if (!editingAgent) return;
    try {
      await updateMutation.mutateAsync({ id: editingAgent.id, data });
      toast.success("Agent updated successfully");
      setEditingAgent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update agent");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    try {
      await deleteMutation.mutateAsync(deletingAgent.id);
      toast.success("Agent removed successfully");
      setDeletingAgent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove agent");
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingAgent(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Agents" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Agent Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage your call center agents and their profiles
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-red-500">
                Failed to load agents. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents ({agents?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents && agents.length > 0 ? (
                <div className="grid gap-4">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onEdit={handleEdit}
                      onDelete={setDeletingAgent}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "No agents found matching your search."
                      : "No agents yet. Add your first agent to get started."}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Agent
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Form */}
      <AgentForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        agent={editingAgent}
        onSubmit={editingAgent ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {deletingAgent?.firstName} {deletingAgent?.lastName}
              </strong>{" "}
              ({deletingAgent?.employeeId})?
              <span className="block mt-2 text-sm">
                This will deactivate the agent. Their schedule history will be preserved.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingAgent(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
