import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Award, PlusCircle, Trash2 } from "lucide-react";
import { WinLoss } from "@/entities/WinLoss";

const outcomes = ["Win", "Loss"];
const transactionTypes = ["Tenant Rep", "Buyer Rep", "Seller Rep", "Agency Leasing", "Corporate Services", "Debt", "Equity"];
const assetTypes = ["Industrial", "Office", "Multifamily", "Land", "IOS", "Retail", "Hospitality", "Healthcare", "Data Center", "Other"];
const services = ["Valuation", "Project Management", "Lease Administration", "Facility Management", "Account Management", "Facilities Management"];

// Helper array for month names
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const emptyEntry = {
  client: "",
  transaction_type: "",
  asset_type: "",
  asset_type_other: "",
  budget_year_revenue_impact: "",
  total_revenue_impact: "",
  lead_broker: "",
  date_won: "",
  square_footage: "",
  engagement_type: "One-off",
  services_involved: [],
  outcome: "",
  reason: "",
};

export default function OfficeWinLossForm({
  winLosses,
  onUpdate,
  submission,
  region,
  market,
  isSubmissionPeriod,
  onNetworkError,
  ensureSubmissionHasId,
}) {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  // Get current month name for display
  const currentMonthName = submission?.month ? monthNames[parseInt(submission.month.split('-')[1], 10) - 1] : '';

  // CRITICAL FIX: Only initialize from props on mount or when submission ID changes
  // Do NOT update from props during normal operation - this would erase unsaved entries!
  const initializedRef = useRef(false);
  const submissionIdRef = useRef(submission?.id);

  useEffect(() => {
    // Only update if this is the first load OR if we switched to a different submission
    if (!initializedRef.current || submissionIdRef.current !== submission?.id) {
      if (winLosses) {
        setEntries(winLosses);
        initializedRef.current = true;
        submissionIdRef.current = submission?.id;
      }
    }
  }, [winLosses, submission?.id]);

  const handleUpdate = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    if (field === 'engagement_type' && value === 'One-off') {
      newEntries[index]['services_involved'] = [];
    }
    setEntries(newEntries);
  };

  const handleSave = async (index) => {
    if (!isSubmissionPeriod || saving) return;
    const originalEntry = { ...entries[index] };

    // Do not attempt to save an entirely empty new entry
    if (!originalEntry.id && !originalEntry.client && !originalEntry.outcome) {
      console.warn("Skipping save for empty new entry.");
      return;
    }

    setSaving(true);
    // Clear any previous network errors before a new save attempt
    if (onNetworkError) onNetworkError(null);

    try {
      const entryToSave = { ...originalEntry };

      // Parse and clean up numeric fields
      const budgetYearRevenue = parseFloat(entryToSave.budget_year_revenue_impact);
      entryToSave.budget_year_revenue_impact = isNaN(budgetYearRevenue) ? 0 : budgetYearRevenue;

      const totalRevenue = parseFloat(entryToSave.total_revenue_impact);
      entryToSave.total_revenue_impact = isNaN(totalRevenue) ? 0 : totalRevenue;

      const sqft = parseFloat(entryToSave.square_footage);
      entryToSave.square_footage = isNaN(sqft) ? 0 : sqft;

      if (entryToSave.id) {
        // Update existing entry
        await WinLoss.update(entryToSave.id, entryToSave);
      } else {
        // Create new entry
        if (!entryToSave.client) {
          setSaving(false);
          if (onNetworkError) onNetworkError("Client name is required for new entries.");
          return;
        }

        // Ensure the submission has an ID before creating a new win/loss entry
        const submissionId = await ensureSubmissionHasId();
        if (!submissionId) {
          throw new Error("Could not retrieve a submission ID to save the entry. Please ensure the submission is saved first.");
        }

        const newEntry = await WinLoss.create({
          ...entryToSave,
          submission_id: submissionId, // Use the ID from ensureSubmissionHasId
          region: region || submission?.region || market?.region || 'Global',
          month: submission?.month,
          office_location: market?.name
        });
        // Update local state with the saved entry (now has an ID)
        const updatedEntries = [...entries];
        updatedEntries[index] = newEntry;
        setEntries(updatedEntries);
      }
      
      // Don't call onUpdate() here - it causes refetch which overwrites local state!
      // Only call it after delete to refresh the list
    } catch (error) {
      console.error('Error saving win/loss:', error);
      if (onNetworkError) {
        // Provide more specific error message based on the error object
        onNetworkError(`Failed to save win/loss data: ${error.message || "Please check your connection and try again."}`);
      }
    } finally {
      setSaving(false); // Reset saving state
    }
  };

  const addEntry = () => {
    if (!isSubmissionPeriod || saving) return;
    setEntries([{ ...emptyEntry }, ...entries]); // Add to beginning of array
  };

  const removeEntry = async (index) => {
    if (!isSubmissionPeriod || saving) return; // Prevent deletions if not in submission period
    setSaving(true);
    const entry = entries[index];
    try {
      if (entry.id) {
        // Only attempt to delete from backend if it's a saved entry
        await WinLoss.delete(entry.id);
      }
      // Remove from local state regardless of whether it was saved or not
      const newEntries = entries.filter((_, i) => i !== index);
      setEntries(newEntries);
      if (onUpdate) onUpdate(); // Only refresh after delete
    } catch (error) {
      console.error('Error deleting win/loss:', error);
      if (onNetworkError) {
        onNetworkError(`Failed to delete win/loss data: ${error.message || "Please check your connection and try again."}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="text-purple-600" />
            <div>
              <span className="text-slate-900">1. Notable Wins / Losses for {currentMonthName} (&gt; $250K)</span>
              <p className="text-sm text-slate-600 mt-1 font-normal">
                <strong>Wins</strong> refer to any new business Avison Young has secured that we've been paid on or to be paid on, generating over $250,000 in fees.<br />
                <strong>Losses</strong> refer to existing business that Avison Young previously held but no longer retains. For example, losing an agency assignment after a building sale where the new owner awarded it to CBRE.
              </p>
            </div>
          </div>
          {isSubmissionPeriod &&
            <Button
              variant="outline"
              size="sm"
              onClick={addEntry}
              className="bg-slate-300 text-slate-700 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-9 rounded-md"
              disabled={saving} // Disable add button while saving
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry, index) =>
          <div key={entry.id || index} className="p-4 border rounded-lg bg-slate-800 space-y-4 relative">
            {isSubmissionPeriod &&
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-slate-300 hover:text-red-400"
                onClick={() => removeEntry(index)}
                disabled={saving} // Disable remove button while saving
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            }

            {/* First Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Client Name</Label>
                <Input
                  placeholder="Client Name"
                  value={entry.client}
                  onChange={(e) => handleUpdate(index, 'client', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Outcome</Label>
                <Select
                  value={entry.outcome}
                  onValueChange={(value) => { handleUpdate(index, 'outcome', value); handleSave(index); }}
                  disabled={!isSubmissionPeriod || saving}
                >
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Outcome (Win/Loss)" />
                  </SelectTrigger>
                  <SelectContent>
                    {outcomes.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row - Revenue Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Estimated Current Year Revenue Impact</Label>
                <Input
                  type="number"
                  placeholder="Estimated Current Year Revenue Impact"
                  value={entry.budget_year_revenue_impact || ''}
                  onChange={(e) => handleUpdate(index, 'budget_year_revenue_impact', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Estimated Total Revenue Impact (Approx. next 3 years)</Label>
                <Input
                  type="number"
                  placeholder="Estimated Total Revenue Impact (Approx. next 3 years)"
                  value={entry.total_revenue_impact || ''}
                  onChange={(e) => handleUpdate(index, 'total_revenue_impact', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>
            </div>

            {/* Third Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Transaction Type</Label>
                <Select
                  value={entry.transaction_type}
                  onValueChange={(value) => { handleUpdate(index, 'transaction_type', value); handleSave(index); }}
                  disabled={!isSubmissionPeriod || saving}
                >
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>{transactionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Asset Type</Label>
                <Select
                  value={entry.asset_type}
                  onValueChange={(value) => { handleUpdate(index, 'asset_type', value); handleSave(index); }}
                  disabled={!isSubmissionPeriod || saving}
                >
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Asset Type" />
                  </SelectTrigger>
                  <SelectContent>{assetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Asset Type Other Specification */}
            {entry.asset_type === 'Other' && (
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Please Specify Asset Type</Label>
                <Input
                  placeholder="Please specify..."
                  value={entry.asset_type_other || ''}
                  onChange={(e) => handleUpdate(index, 'asset_type_other', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
                />
              </div>
            )}

            {/* Fourth Row */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Lead Broker</Label>
                <Input
                  placeholder="Lead Broker"
                  value={entry.lead_broker}
                  onChange={(e) => handleUpdate(index, 'lead_broker', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Date Won/Lost</Label>
                <Input
                  type="date"
                  placeholder="Date Won/Lost"
                  value={entry.date_won}
                  onChange={(e) => handleUpdate(index, 'date_won', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Square Footage</Label>
                <Input
                  type="number"
                  placeholder="Square Footage"
                  value={entry.square_footage || ''}
                  onChange={(e) => handleUpdate(index, 'square_footage', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>
            </div>

            {/* Fifth Row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Engagement Type Radio Group */}
              <div className="space-y-2 p-4 rounded-lg bg-slate-800">
                <Label className="text-sm font-medium text-slate-50">Engagement Type</Label>
                <RadioGroup
                  value={entry.engagement_type}
                  onValueChange={(value) => { handleUpdate(index, 'engagement_type', value); handleSave(index); }}
                  disabled={!isSubmissionPeriod || saving}
                  className="flex gap-6">

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="One-off" id={`one-off-${index}`} className="border-slate-400 text-slate-50" />
                    <Label htmlFor={`one-off-${index}`} className="text-slate-50">One-off</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Multi-serviced" id={`multi-serviced-${index}`} className="border-slate-400 text-slate-50" />
                    <Label htmlFor={`multi-serviced-${index}`} className="text-slate-50">Multi-serviced</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Services Involved - only show if Multi-serviced */}
            {entry.engagement_type === 'Multi-serviced' &&
              <div>
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Services Involved</Label>
                <MultiSelect
                  options={services}
                  value={entry.services_involved || []}
                  onChange={(value) => { handleUpdate(index, 'services_involved', value); handleSave(index); }}
                  placeholder="Services Involved"
                  disabled={!isSubmissionPeriod || saving}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>
            }

            {/* Reason Text Area */}
            <div>
              <Label className="text-sm font-medium text-slate-50 mb-2 block">Reason for Win/Loss</Label>
              <Textarea
                placeholder="Brief explanation of why the business was won or lost..."
                value={entry.reason}
                onChange={(e) => handleUpdate(index, 'reason', e.target.value)}
                disabled={!isSubmissionPeriod || saving}
                onBlur={() => handleSave(index)}
                className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
            </div>

          </div>
        )}
        {entries.length === 0 && <p className="text-slate-500 text-center py-4">No entries added.</p>}
      </CardContent>
    </Card>
  );
}