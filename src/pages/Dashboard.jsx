import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ActionSelection from "../components/auth/ActionSelection";
import RegionalDashboard from "./RegionalDashboard";

export default function Dashboard() {
    const navigate = useNavigate();

  // SIMPLIFIED STATE MACHINE - Only one source of truth
  const [currentView, setCurrentView] = useState('role-selection'); // 'role-selection' | 'action-selection' | 'dashboard'
  const [selectedRole, setSelectedRole] = useState("");

  const handleProceed = () => {
        if (!selectedRole) return;

        if (selectedRole === 'admin') {
                navigate(createPageUrl("AdminPanel"));
        } else if (selectedRole === 'president') {
                navigate(createPageUrl("LeadershipDashboard"));
        } else if (selectedRole === 'business_line_leader') {
                navigate(createPageUrl("BusinessLineReport"));
        } else if (selectedRole === 'md' || selectedRole === 'rmd') {
                setCurrentView('action-selection');
        }
  };

  const handleActionSelected = (action) => {
        if (action === 'report') {
                if (selectedRole === 'md') {
                          navigate(createPageUrl("OfficeReport"));
                } else {
                          navigate(createPageUrl("MonthlyReport"));
                }
        } else if (action === 'dashboard') {
                setCurrentView('dashboard');
        }
  };

  const handleBackToRoleSelection = () => {
        setCurrentView('role-selection');
        setSelectedRole("");
  };

  // RENDER BASED ON SINGLE STATE VARIABLE
  if (currentView === 'dashboard') {
        return <RegionalDashboard userRegion={null} />;
  }

  if (currentView === 'action-selection') {
        return (
                <ActionSelection
                          onActionSelected={handleActionSelected}
                          onBack={handleBackToRoleSelection}
                          selectedRole={selectedRole}
                          verifiedRegion={null}
                        />
              );
  }

  // DEFAULT: Role Selection View
  return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
              <div className="w-full max-w-5xl">
                      <div className="text-center mb-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                                            <Building2 className="w-10 h-10 text-white" />
                                </div>div>
                                <h1 className="text-4xl font-bold text-slate-900 mb-4">
                                            Monthly Business Review
                                </h1>h1>
                                <p className="text-xl text-slate-600 max-w-lg mx-auto">
                                            A comprehensive platform to monitor the health and outlook of your region.
                                </p>p>
                      </div>div>
              
                      <div className="mt-12 max-w-md mx-auto">
                                <Card className="shadow-xl border-0 bg-white">
                                            <CardHeader className="text-center">
                                                          <CardTitle className="text-xl font-bold text-slate-900">
                                                                          Select Your Role to Continue
                                                          </CardTitle>CardTitle>
                                                          <CardDescription className="pt-2">
                                                                          What is your role at Avison Young?
                                                          </CardDescription>CardDescription>
                                            </CardHeader>CardHeader>
                                            <CardContent className="space-y-6">
                                                          <Select onValueChange={setSelectedRole} value={selectedRole}>
                                                                          <SelectTrigger className="w-full h-12 text-lg">
                                                                                            <SelectValue placeholder="Choose your role..." />
                                                                          </SelectTrigger>SelectTrigger>
                                                                          <SelectContent>
                                                                                            <SelectItem value="rmd">Regional Managing Director</SelectItem>SelectItem>
                                                                                            <SelectItem value="md">Managing Director</SelectItem>SelectItem>
                                                                                            <SelectItem value="president">Country President</SelectItem>SelectItem>
                                                                                            <SelectItem value="business_line_leader">Business Line Leader</SelectItem>SelectItem>
                                                                                            <SelectItem value="admin">Corporate Finance</SelectItem>SelectItem>
                                                                          </SelectContent>SelectContent>
                                                          </Select>Select>
                                            
                                                          <Button
                                                                            onClick={handleProceed}
                                                                            disabled={!selectedRole}
                                                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium"
                                                                          >
                                                                          Proceed <ArrowRight className="ml-2 w-5 h-5" />
                                                          </Button>Button>
                                            </CardContent>CardContent>
                                </Card>Card>
                      </div>div>
              </div>div>
        </div>div>
      );
}</div>
