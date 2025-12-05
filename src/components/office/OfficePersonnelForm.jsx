import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, PlusCircle, Trash2 } from "lucide-react";
import { PersonnelUpdate } from "@/entities/PersonnelUpdate";

const statuses = ["Hired", "Terminated", "Resigned"];

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const emptyEntry = {
  name: "",
  title_specialty: "",
  status: "",
  revenue_impact: "",
  notes: "",
};

export default function OfficePersonnelForm({
  personnelUpdates,
  onUpdate,
  submission,
  market,
  isSubmissionPeriod,
  onNetworkError,
  ensureSubmissionHasId,
}) {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);

  const currentMonthName = submission?.month ? monthNames[parseInt(submission.month.split('-')[1], 10) - 1] : '';

  // CRITICAL FIX: Only initialize from props on mount or when submission ID changes
  // Do NOT update from props during normal operation - this would erase unsaved entries!
  const initializedRef = useRef(false);
  const submissionIdRef = useRef(submission?.id);

  useEffect(() => {
    // Only update if this is the first load OR if we switched to a different submission
    if (!initializedRef.current || submissionIdRef.current !== submission?.id) {
      if (personnelUpdates) {
        setEntries(personnelUpdates);
        initializedRef.current = true;
        submissionIdRef.current = submission?.id;
      }
    }
  }, [submission?.id]); // Only depend on submission ID, not personnelUpdates prop

  const handleUpdate = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSave = async (index) => {
    if (!isSubmissionPeriod || saving) return;
    const originalEntry = { ...entries[index] };

    // Skip saving for completely empty new entries that haven't been touched, unless they have an ID (i.e. already saved)
    if (!originalEntry.id && !originalEntry.name && !originalEntry.status && !originalEntry.title_specialty && !originalEntry.revenue_impact && !originalEntry.notes) {
      console.warn("Skipping save for empty new personnel entry.");
      return;
    }

    setSaving(true);
    if (onNetworkError) onNetworkError(null); // Clear previous network errors

    try {
      const entryToSave = { ...originalEntry };
      const revenueImpact = parseFloat(entryToSave.revenue_impact);
      entryToSave.revenue_impact = isNaN(revenueImpact) ? 0 : revenueImpact;

      // The outline removes the sign-setting logic based on status.
      // If that logic is still needed, it should be re-added here.
      // As per outline, only parse and default to 0 if NaN.

      if (entryToSave.id) {
        // Update existing entry
        await PersonnelUpdate.update(entryToSave.id, entryToSave);
      } else {
        // Create new entry
        // Ensure required fields are present for new entries
        if (!entryToSave.name) {
          setSaving(false);
          if (onNetworkError) onNetworkError("Personnel name is required for new entries.");
          return;
        }

        const submissionId = await ensureSubmissionHasId();
        if (!submissionId) {
          throw new Error("Could not retrieve a submission ID to save the entry.");
        }

        const newEntry = await PersonnelUpdate.create({
          ...entryToSave,
          submission_id: submissionId,
          region: submission?.region || market?.region,
          month: submission?.month,
          office_location: market?.name,
        });

        // Update the state with the newly created entry (which now has an ID)
        const updatedEntries = [...entries];
        updatedEntries[index] = newEntry;
        setEntries(updatedEntries);
      }

      // Don't call onUpdate() here - it causes refetch which overwrites local state!
      // Only call it after delete to refresh the list
    } catch (error) {
      console.error("Error saving personnel update:", error);
      if (onNetworkError) {
        onNetworkError(`Failed to save personnel data: ${error.message || "Please check your connection and try again."}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const addEntry = () => {
    if (!isSubmissionPeriod || saving) return;
    // Add a new empty entry to the beginning of the state
    setEntries([{ ...emptyEntry }, ...entries]);
  };

  const removeEntry = async (index) => {
    if (!isSubmissionPeriod || saving) return;
    setSaving(true);
    const entry = entries[index];
    try {
      if (entry.id) {
        // If the entry has an ID, it exists in the database, so delete it
        await PersonnelUpdate.delete(entry.id);
      }
      // Remove the entry from the local state
      const newEntries = entries.filter((_, i) => i !== index);
      setEntries(newEntries);
      if (onUpdate) onUpdate(); // Only refresh after delete
    } catch (error) {
      console.error('Error deleting personnel update:', error);
      if (onNetworkError) {
        onNetworkError(`Failed to delete personnel data: ${error.message || "Please check your connection and try again."}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Derive disabled state from isSubmissionPeriod and saving status
  const disabled = !isSubmissionPeriod || saving;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-teal-600" />
            <div>
              <span className="text-slate-900">3. Notable Personnel Changes (&gt; $250K)</span>
              <p className="text-sm text-slate-600 mt-1 font-normal">
                This should only include revenue producing staff with an estimated impact of over $250,000. Please use their pipeline as a reference.
              </p>
            </div>
          </div>
          {!disabled &&
            <Button variant="outline" size="sm" onClick={addEntry} className="bg-slate-300 text-slate-700 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-9 rounded-md">
              <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry, index) =>
          <div key={entry.id || `new-${index}`} className="p-4 border rounded-lg bg-slate-100 space-y-4 relative">
            {!disabled &&
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-500 hover:text-red-500" onClick={() => removeEntry(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            }

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Name"
                value={entry.name || ''}
                onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                disabled={disabled}
                onBlur={() => handleSave(index)}
                className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />

              <Select value={entry.status || ''} onValueChange={(value) => { handleUpdate(index, 'status', value); handleSave(index); }} disabled={disabled}>
                <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <Input
                placeholder="Title/Specialty"
                value={entry.title_specialty || ''}
                onChange={(e) => handleUpdate(index, 'title_specialty', e.target.value)}
                disabled={disabled}
                onBlur={() => handleSave(index)}
                className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <Input
                type="number"
                placeholder="Budgeted Revenue Impact"
                value={entry.revenue_impact || ''}
                onChange={(e) => handleUpdate(index, 'revenue_impact', e.target.value)}
                disabled={disabled}
                onBlur={() => handleSave(index)}
                className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />
            </div>

            <Textarea
              placeholder="Notes..."
              value={entry.notes || ''}
              onChange={(e) => handleUpdate(index, 'notes', e.target.value)}
              disabled={disabled}
              onBlur={() => handleSave(index)}
              className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400" />

          </div>
        )}
        {entries.length === 0 && <p className="text-slate-500 text-center py-4">No entries added.</p>}
      </CardContent>
    </Card>
  );
}