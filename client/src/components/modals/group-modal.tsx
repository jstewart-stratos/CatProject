import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: any;
  onSuccess: () => void;
}

export default function GroupModal({ isOpen, onClose, group, onSuccess }: GroupModalProps) {
  const { toast } = useToast();
  const isEditing = !!group;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      ...group,
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name || "",
        description: group.description || "",
      });
      // Get existing group members if editing
      if (group.id) {
        fetchGroupMembers(group.id);
      }
    } else {
      form.reset({
        name: "",
        description: "",
      });
      setSelectedUsers([]);
    }
  }, [group, form]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await apiRequest("GET", `/api/groups/${groupId}/members`);
      setSelectedUsers(response.map((member: any) => member.userId));
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const url = isEditing ? `/api/groups/${group.id}` : "/api/groups";
      const method = isEditing ? "PUT" : "POST";
      
      // Create the group first
      const groupResponse = await apiRequest(method, url, data);
      
      // If we have selected users, add them to the group
      if (selectedUsers.length > 0) {
        const groupId = isEditing ? group.id : groupResponse.id;
        
        // Clear existing members if editing
        if (isEditing) {
          await apiRequest("DELETE", `/api/groups/${groupId}/members`);
        }
        
        // Add selected users
        await apiRequest("POST", `/api/groups/${groupId}/members`, {
          userIds: selectedUsers
        });
      }
      
      return groupResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onSuccess();
      toast({
        title: "Success",
        description: `Group ${isEditing ? "updated" : "created"} successfully`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} group`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GroupFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{isEditing ? "Edit Group" : "Create New Group"}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter group name (e.g., Sales Team, Operations Team)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the purpose of this group and what data members will share"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-base">Group Members</FormLabel>
              <p className="text-sm text-muted-foreground mb-4">
                Select users who will be able to share and view each other's client and account data
              </p>
              
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-md p-3">
                {users?.map((user: any) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => 
                        handleUserSelection(user.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={user.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                      {user.firstName} {user.lastName} ({user.username}) - {user.role}
                    </label>
                  </div>
                ))}
              </div>

              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Selected members ({selectedUsers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = users?.find((u: any) => u.id === userId);
                      return user ? (
                        <Badge 
                          key={userId} 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {user.firstName} {user.lastName}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleUserSelection(userId, false)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Group" : "Create Group")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}