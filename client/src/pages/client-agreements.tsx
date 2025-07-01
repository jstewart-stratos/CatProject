import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertClientAgreementSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { Plus, Eye, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const createAgreementSchema = insertClientAgreementSchema.extend({
  agreementDate: z.string().min(1, "Agreement date is required"),
  businessLine: z.string().min(1, "Business line is required"),
});

type CreateAgreementData = z.infer<typeof createAgreementSchema>;

export default function ClientAgreementsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all households for the dropdown
  const { data: householdsResponse } = useQuery({
    queryKey: ["/api/households"],
  });
  const households = householdsResponse?.households || [];

  // Fetch all client agreements
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["/api/client-agreements"],
  });

  const form = useForm<CreateAgreementData>({
    resolver: zodResolver(createAgreementSchema),
    defaultValues: {
      businessLine: "",
      householdId: 0,
      version: 1,
      agreementDate: new Date().toISOString().split('T')[0],
      status: "active",
    },
  });

  const businessLineOptions = [
    { value: "SWP", label: "Stratos Wealth Partners (SWP)" },
    { value: "SWA", label: "Stratos Wealth Advisors (SWA)" },
  ];

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNewAgreement = () => {
    setCurrentStep(1);
    setIsCreateDialogOpen(true);
    form.reset();
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAgreementData) => {
      const payload = {
        ...data,
        householdId: parseInt(data.householdId.toString()),
      };
      return apiRequest("POST", "/api/client-agreements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-agreements"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Client agreement created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client agreement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/client-agreements/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-agreements"] });
      toast({
        title: "Success",
        description: "Client agreement deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client agreement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAgreementData) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this client agreement?")) {
      deleteMutation.mutate(id);
    }
  };

  const getHouseholdName = (householdId: number) => {
    const household = households.find((h: any) => h.id === householdId);
    return household?.householdName || `Household ${householdId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "superseded":
        return "secondary";
      case "void":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentView="client-agreements" />
      <div className="lg:ml-64">
        <TopBar 
          title="Client Agreements" 
          subtitle="Manage household client agreements and PDF documents"
        />
        
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Client Agreements
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create and manage client agreements for households
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewAgreement}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Agreement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Client Agreement</DialogTitle>
                  <DialogDescription>
                    Step {currentStep} of 3: Set up a new client agreement for a household.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Step 1: Business Line Selection */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="businessLine"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">Business Line</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  {businessLineOptions.map((option) => (
                                    <div key={option.value} className="flex items-center space-x-3">
                                      <input
                                        type="radio"
                                        id={option.value}
                                        value={option.value}
                                        checked={field.value === option.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                      />
                                      <label 
                                        htmlFor={option.value} 
                                        className="text-sm font-medium text-gray-900 cursor-pointer"
                                      >
                                        {option.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Step 2: Household Selection */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="householdId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">Household</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a household" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {households.map((household: any) => (
                                    <SelectItem key={household.id} value={household.id.toString()}>
                                      {household.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Step 3: Agreement Details */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="agreementDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agreement Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <DialogFooter className="flex justify-between">
                      <div className="flex space-x-2">
                        {currentStep > 1 && (
                          <Button type="button" variant="outline" onClick={handlePrevious}>
                            Previous
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {currentStep < 3 ? (
                          <Button 
                            type="button" 
                            onClick={handleNext}
                            disabled={
                              (currentStep === 1 && !form.watch("businessLine")) ||
                              (currentStep === 2 && !form.watch("householdId"))
                            }
                          >
                            Next
                          </Button>
                        ) : (
                          <Button 
                            type="submit" 
                            disabled={createMutation.isPending}
                          >
                            {createMutation.isPending ? "Creating..." : "Create Agreement"}
                          </Button>
                        )}
                      </div>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Client Agreements</CardTitle>
              <CardDescription>
                View and manage all client agreements across households
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading agreements...</div>
              ) : agreements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No client agreements found. Create your first agreement to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Household</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Agreement Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreements.map((agreement: any) => (
                      <TableRow key={agreement.id}>
                        <TableCell className="font-medium">
                          {getHouseholdName(agreement.householdId)}
                        </TableCell>
                        <TableCell>v{agreement.version}</TableCell>
                        <TableCell>
                          {format(new Date(agreement.agreementDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(agreement.status) as any}>
                            {agreement.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(agreement.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {agreement.pdfFileName ? (
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(agreement.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}