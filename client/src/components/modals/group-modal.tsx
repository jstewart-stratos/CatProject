import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { insertGroupSchema } from "@shared/schema";
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

const groupFormSchema = insertGroupSchema.extend({
  name: z.string().min(1, "Group name is required"),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: any;
  onSuccess: () => void;
}

const availablePermissions = [
  "read_clients",
  "write_clients",
  "delete_clients",
  "read_accounts",
  "write_accounts",
  "delete_accounts",
  "import_data",
  "export_data",
  "user_management",
  "group_management",
  "view_audit_logs",
];

export default function GroupModal({ isOpen, onClose, group, onSuccess }: GroupModalProps) {
  const { toast } = useToast();
  const isEditing = !!group;
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
      ...group,
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name || "",
        description: group.description || "",
        permissions: group.permissions || [],
      });
      setSelectedPermissions(group.permissions || []);
    } else {
      form.reset({
        name: "",
        description: "",
        permissions: [],
      });
      setSelectedPermissions([]);
    }
  }, [group, form]);

  const handlePermissionChange = (permission: string, checked: boolean) => {
    let newPermissions: string[];
    if (checked) {
      newPermissions = [...selectedPermissions, permission];
    } else {
      newPermissions = selectedPermissions.filter(p => p !== permission);
    }
    setSelectedPermissions(newPermissions);
    form.setValue("permissions", newPermissions);
  };

  const mutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const payload = {
        ...data,
        permissions: selectedPermissions,
      };
      const url = isEditing ? `/api/groups/${group.id}` : "/api/groups";
      const method = isEditing ? "PUT" : "POST";
      return await apiRequest(method, url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onSuccess();
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
                    <Input {...field} placeholder="Enter group name" />
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
                      placeholder="Describe the purpose and responsibilities of this group"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="text-base">Permissions</FormLabel>
              <p className="text-sm text-muted-foreground mb-4">
                Select the permissions that members of this group will have
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {availablePermissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(permission, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={permission}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {permission.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>

              {selectedPermissions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selected Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPermissions.map((permission) => (
                      <Badge key={permission} variant="secondary">
                        {permission.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update Group" : "Create Group"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
