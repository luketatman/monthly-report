import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Target, PlusCircle, Trash2 } from "lucide-react";
import { Pitch } from "@/entities/Pitch";

const transactionTypes = ["Tenant Rep", "Buyer Rep", "Seller Rep", "Agency Leasing", "Corporate Services", "Debt", "Equity"];
const assetTypes = ["Industrial", "Office", "Multifamily", "Land", "IOS", "Retail", "Hospitality", "Healthcare", "Data Center", "Other"];
const services = ["Brokerage", "Project Mgmt", "Workplace", "Valuation", "Capital Markets", "Other"];
const originationSources = ["Referral", "Broker Lead", "Marketing", "Cross-Sell", "Existing Client", "Other"];
const stages = ["Meeting Scheduled", "Waiting to Hear Back", "Out for Signature", "Lost"];
const engagementTypes = ["One-off", "Multi-serviced"];

const emptyEntry = {
  client: "",
  budget_year_revenue_impact: "",
  total_revenue_impact: "",
  stage: "",
  origination_source: "",
  transaction_type: "",
  asset_type: "",
  asset_type_other: "",
  lead_broker: "",
  square_footage: "",
  engagement_type: "One-off",
  services_involved: [],
  summary: "",
};

export default function OfficePitchForm({
  pitches,
  onUpdate,
  submission,
  market,
  isSubmissionPeriod,
  onNetworkError,
  ensureSubmissionHasId,
}) {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  // CRITICAL FIX: Only initialize from props on mount or when submission ID changes
  // Do NOT update from props during normal operation - this would erase unsaved entries!
  const initializedRef = useRef(false);
  const submissionIdRef = useRef(submission?.id);

  useEffect(() => {
    // Only update if this is the first load OR if we switched to a different submission
    if (!initializedRef.current || submissionIdRef.current !== submission?.id) {
      if (pitches) {
        setEntries(pitches);
        initializedRef.current = true;
        submissionIdRef.current = submission?.id;
      }
    }
  }, [pitches, submission?.id]);

  const handleUpdate = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    // Keep this specific logic for 'engagement_type' cleanup
    if (field === 'engagement_type' && value === 'One-off') {
      newEntries[index]['services_involved'] = [];
    }
    setEntries(newEntries);
  };

  const handleSave = async (index) => {
    if (!isSubmissionPeriod || saving) return;
    const originalEntry = { ...entries[index] };

    // Skip saving for new entries that are still completely empty
    if (!originalEntry.id && !originalEntry.client && !originalEntry.stage) {
      console.warn("Skipping save for empty new entry without client or stage.");
      return;
    }

    setSaving(true);
    if (onNetworkError) onNetworkError(null); // Clear previous network errors

    try {
      const entryToSave = { ...originalEntry };

      // Parse numerical fields, ensuring they are numbers or 0
      const budgetRevenue = parseFloat(entryToSave.budget_year_revenue_impact);
      entryToSave.budget_year_revenue_impact = isNaN(budgetRevenue) ? 0 : budgetRevenue;

      const totalRevenue = parseFloat(entryToSave.total_revenue_impact);
      entryToSave.total_revenue_impact = isNaN(totalRevenue) ? 0 : totalRevenue;

      const sqft = parseFloat(entryToSave.square_footage);
      entryToSave.square_footage = isNaN(sqft) ? 0 : sqft;

      if (entryToSave.id) {
        // Update existing entry
        await Pitch.update(entryToSave.id, entryToSave);
      } else {
        // Create new entry
        if (!entryToSave.client) {
          // If client is missing for a new entry, we can't create it.
          // This check is in addition to the initial one, for cases where client might be cleared.
          setSaving(false);
          if (onNetworkError) onNetworkError("Client name is required for new pitch entries.");
          return;
        }

        const submissionId = await ensureSubmissionHasId(); // Ensure submission ID is available
        if (!submissionId) {
          throw new Error("Could not retrieve a submission ID to save the entry.");
        }

        const newEntry = await Pitch.create({
          ...entryToSave,
          submission_id: submissionId,
          region: submission?.region, // Use submission's region
          month: submission?.month,   // Use submission's month
          office_location: market?.name // Use market name for office_location
        });

        // Update the local state with the new entry (which now has an ID)
        const updatedEntries = [...entries];
        updatedEntries[index] = newEntry;
        setEntries(updatedEntries);
      }
      // Don't call onUpdate() here - it causes refetch which overwrites local state!
      // Only call it after delete to refresh the list
    } catch (error) {
      console.error('Error saving pitch:', error);
      if (onNetworkError) {
        onNetworkError(`Failed to save pitch data: ${error.message}. Please check your connection and try again.`);
      }
    } finally {
      setSaving(false);
    }
  };

  const addEntry = () => {
    if (!isSubmissionPeriod || saving) return;
    setEntries([{ ...emptyEntry }, ...entries]); // Add to beginning of array
  };

  const removeEntry = async (index) => {
    if (!isSubmissionPeriod || saving) return;
    setSaving(true);
    const entry = entries[index];
    try {
      if (entry.id) {
        await Pitch.delete(entry.id);
      }
      setEntries(entries.filter((_, i) => i !== index));
      if (onUpdate) onUpdate(); // Only refresh after delete
    } catch (error) {
      console.error('Error deleting pitch:', error);
      if (onNetworkError) {
        onNetworkError(`Failed to delete pitch data: ${error.message}. Please check your connection and try again.`);
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
            <Target className="text-orange-600" />
            <div>
              <span className="text-slate-900">2. Notable Pitches (&gt; $100K)</span>
              <p className="text-sm text-slate-600 mt-1 font-normal">
                Pitches include any and all new pitches that occurred this month, as well as updates on previously submitted pitches. If a pitch was won and has been paid on, please include it in the Wins and Losses section.
              </p>
            </div>
          </div>
          {isSubmissionPeriod &&
            <Button variant="outline" size="sm" onClick={addEntry} className="bg-slate-300 text-slate-700 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-9 rounded-md">
              <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry, index) =>
          <div key={entry.id || `pitch-${index}`} className="p-4 border rounded-lg bg-slate-100 space-y-4 relative">
            {isSubmissionPeriod &&
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-500 hover:text-red-500" onClick={() => removeEntry(index)} disabled={saving}>
                <Trash2 className="w-4 h-4" />
              </Button>
            }

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Client Name</Label>
                <Input
                  placeholder="Client Name"
                  value={entry.client || ''}
                  onChange={(e) => handleUpdate(index, 'client', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Stage</Label>
                <Select value={entry.stage || ''} onValueChange={(value) => { handleUpdate(index, 'stage', value); handleSave(index); }} disabled={!isSubmissionPeriod || saving}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>{stages.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Revenue Impact Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Budget Year Revenue Impact</Label>
                <Input
                  type="number"
                  placeholder="Budget Year Estimated Revenue Impact"
                  value={entry.budget_year_revenue_impact || ''}
                  onChange={(e) => handleUpdate(index, 'budget_year_revenue_impact', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Total Revenue Impact</Label>
                <Input
                  type="number"
                  placeholder="Total Revenue Impact"
                  value={entry.total_revenue_impact || ''}
                  onChange={(e) => handleUpdate(index, 'total_revenue_impact', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Transaction Type</Label>
                <Select value={entry.transaction_type || ''} onValueChange={(value) => { handleUpdate(index, 'transaction_type', value); handleSave(index); }} disabled={!isSubmissionPeriod || saving}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>{transactionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Asset Type</Label>
                <Select value={entry.asset_type || ''} onValueChange={(value) => { handleUpdate(index, 'asset_type', value); handleSave(index); }} disabled={!isSubmissionPeriod || saving}>
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
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Please Specify Asset Type</Label>
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

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Lead Broker</Label>
                <Input
                  placeholder="Lead Broker"
                  value={entry.lead_broker || ''}
                  onChange={(e) => handleUpdate(index, 'lead_broker', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Square Footage</Label>
                <Input
                  type="number"
                  placeholder="Square Footage"
                  value={entry.square_footage || ''}
                  onChange={(e) => handleUpdate(index, 'square_footage', e.target.value)}
                  disabled={!isSubmissionPeriod || saving}
                  onBlur={() => handleSave(index)}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Origination Source</Label>
                <Select value={entry.origination_source || ''} onValueChange={(value) => { handleUpdate(index, 'origination_source', value); handleSave(index); }} disabled={!isSubmissionPeriod || saving}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="How it Originated" />
                  </SelectTrigger>
                  <SelectContent>{originationSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-lg bg-slate-800">
                {/* Keeping this Label text-slate-50 as it's inside a dark background div */}
                <Label className="text-sm font-medium text-slate-50 mb-2 block">Engagement Type</Label>
                <RadioGroup
                  value={entry.engagement_type}
                  onValueChange={(value) => { handleUpdate(index, 'engagement_type', value); handleSave(index); }}
                  disabled={!isSubmissionPeriod || saving}
                  className="flex gap-6">

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="One-off" id={`pitch-one-off-${index}`} className="border-slate-400 text-slate-50" />
                    <Label htmlFor={`pitch-one-off-${index}`} className="text-slate-50">One-off</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Multi-serviced" id={`pitch-multi-serviced-${index}`} className="border-slate-400 text-slate-50" />
                    <Label htmlFor={`pitch-multi-serviced-${index}`} className="text-slate-50">Multi-serviced</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {entry.engagement_type === 'Multi-serviced' &&
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Services Involved</Label>
                <MultiSelect
                  options={services}
                  value={entry.services_involved || []}
                  onChange={(value) => { handleUpdate(index, 'services_involved', value); handleSave(index); }}
                  placeholder="Services Involved"
                  disabled={!isSubmissionPeriod || saving}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
              </div>
            }

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Pitch Summary</Label>
              <Textarea
                placeholder="Pitch Summary..."
                value={entry.summary || ''}
                onChange={(e) => handleUpdate(index, 'summary', e.target.value)}
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