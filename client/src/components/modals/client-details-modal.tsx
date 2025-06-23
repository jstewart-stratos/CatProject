import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, Briefcase, DollarSign, Users, Calendar, FileText } from "lucide-react";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export function ClientDetailsModal({ isOpen, onClose, client }: ClientDetailsModalProps) {
  if (!client) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "N/A";
    return phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Details - {client.firstName} {client.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Client ID</label>
                <p className="text-sm">CLI-{client.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Client Type</label>
                <p className="text-sm">
                  <Badge variant="secondary">{client.clientType || "Individual"}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-sm">{client.firstName} {client.middleName} {client.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Alias</label>
                <p className="text-sm">{client.alias || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">SSN</label>
                <p className="text-sm">{client.ssn || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                <p className="text-sm">{formatDate(client.dateOfBirth)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Citizenship</label>
                <p className="text-sm">{client.citizenship || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Residency Status</label>
                <p className="text-sm">{client.residencyStatus || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Signing Method</label>
                <p className="text-sm">{client.signingMethod || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email Address</label>
                <p className="text-sm">{client.emailAddress || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Home Phone</label>
                <p className="text-sm">{formatPhone(client.homePhone)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Mobile Phone</label>
                <p className="text-sm">{formatPhone(client.mobilePhone)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Business Phone</label>
                <p className="text-sm">{formatPhone(client.businessPhone)}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Legal Address</label>
                <p className="text-sm">
                  {client.legalAddress1}{client.legalAddress2 && `, ${client.legalAddress2}`}<br />
                  {client.city}, {client.state} {client.zipCode}
                </p>
              </div>
              {(client.mailingAddress1 || !client.mailingAddressSameAsAbove) && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Mailing Address</label>
                  <p className="text-sm">
                    {client.mailingAddressSameAsAbove ? "Same as Legal Address" : 
                    `${client.mailingAddress1}${client.mailingAddress2 && `, ${client.mailingAddress2}`}<br />
                    ${client.mailingCity}, ${client.mailingState} ${client.mailingZipCode}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Employment Status</label>
                <p className="text-sm">{client.employmentStatus || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Employer</label>
                <p className="text-sm">{client.employerName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Industry</label>
                <p className="text-sm">{client.industry || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Occupation</label>
                <p className="text-sm">{client.occupation || "N/A"}</p>
              </div>
              {client.industryOther && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Industry Other</label>
                  <p className="text-sm">{client.industryOther}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Annual Income</label>
                <p className="text-sm">{client.annualIncome || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tax Bracket</label>
                <p className="text-sm">{client.taxBracket ? `${client.taxBracket}%` : "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Net Worth</label>
                <p className="text-sm">{client.netWorth || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Liquid Net Worth</label>
                <p className="text-sm">{client.liquidNetWorth || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Source of Wealth</label>
                <p className="text-sm">{client.sourceOfWealth || "N/A"}</p>
              </div>
              {client.sourceOfWealthOther && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Source of Wealth Other</label>
                  <p className="text-sm">{client.sourceOfWealthOther}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Investment Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Has Investment Experience</label>
                <p className="text-sm">
                  <Badge variant={client.hasInvestmentExperience ? "default" : "secondary"}>
                    {client.hasInvestmentExperience ? "Yes" : "No"}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Has Other Investments</label>
                <p className="text-sm">
                  <Badge variant={client.hasOtherInvestments ? "default" : "secondary"}>
                    {client.hasOtherInvestments ? "Yes" : "No"}
                  </Badge>
                </p>
              </div>
              {client.investmentExperience && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Investment Experience Details</label>
                  <pre className="text-sm bg-gray-50 p-2 rounded text-wrap">
                    {JSON.stringify(client.investmentExperience, null, 2)}
                  </pre>
                </div>
              )}
              {client.financialInformation && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Financial Information Details</label>
                  <pre className="text-sm bg-gray-50 p-2 rounded text-wrap">
                    {JSON.stringify(client.financialInformation, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trusted Contact */}
          {(client.trustedContactFirstName || client.trustedContactLastName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Trusted Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-sm">{client.trustedContactFirstName} {client.trustedContactLastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Relationship</label>
                  <p className="text-sm">{client.trustedContactRelationship || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{client.trustedContactEmail || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-sm">{formatPhone(client.trustedContactPhone)}</p>
                </div>
                {client.trustedContactAddress1 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm">
                      {client.trustedContactAddress1}{client.trustedContactAddress2 && `, ${client.trustedContactAddress2}`}<br />
                      {client.trustedContactCity}, {client.trustedContactState} {client.trustedContactZipCode}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Created Date</label>
                <p className="text-sm">{formatDate(client.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <p className="text-sm">{formatDate(client.updatedAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <p className="text-sm">{client.createdBy || "System"}</p>
              </div>
              {client.repId && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Rep ID</label>
                  <p className="text-sm">{client.repId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}