"use client";

import { useState, useTransition } from "react";
import { useRole } from "@/lib/role-context";
import { updateHomeProfile } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  BedDouble,
  ShieldCheck,
  Users,
  Save,
  CheckCircle2,
} from "lucide-react";
import type { HomeConstraints, HomeCapabilities } from "@/lib/db/types";

interface HomeData {
  id: string;
  name: string;
  location: string;
  freeBeds: number;
  constraints: HomeConstraints;
  capabilities: HomeCapabilities;
  isRegistered: boolean;
}

interface HomeSettingsFormProps {
  homes: HomeData[];
}

export function HomeSettingsForm({ homes }: HomeSettingsFormProps) {
  const { currentUser } = useRole();
  const home = homes.find((h) => h.id === currentUser?.homeId);

  if (!currentUser || currentUser.role !== "HOME_MANAGER") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please switch to a Home Manager user to view this page.</p>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No home found for your account.</p>
      </div>
    );
  }

  return <SettingsFormInner home={home} />;
}

function SettingsFormInner({ home }: { home: HomeData }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Occupancy
  const [freeBeds, setFreeBeds] = useState(home.freeBeds);

  // Constraints
  const [minAge, setMinAge] = useState(home.constraints.minAge);
  const [maxAge, setMaxAge] = useState(home.constraints.maxAge);
  const [acceptMale, setAcceptMale] = useState(
    home.constraints.genderAllowed.includes("male")
  );
  const [acceptFemale, setAcceptFemale] = useState(
    home.constraints.genderAllowed.includes("female")
  );
  const [notes, setNotes] = useState(home.constraints.notes ?? "");

  // Registration
  const [isRegistered, setIsRegistered] = useState(home.isRegistered);

  // Capabilities
  const [diabetesTrained, setDiabetesTrained] = useState(
    home.capabilities.diabetesTrained
  );
  const [traumaInformed, setTraumaInformed] = useState(
    home.capabilities.traumaInformed
  );
  const [adhdSupport, setAdhdSupport] = useState(
    home.capabilities.adhdSupport
  );
  const [specialistStaff, setSpecialistStaff] = useState(
    home.capabilities.specialistStaff
  );
  const [mentalHealth, setMentalHealth] = useState(
    home.capabilities.mentalHealth
  );

  const handleSave = () => {
    setSaved(false);
    const genderAllowed: ("male" | "female")[] = [];
    if (acceptMale) genderAllowed.push("male");
    if (acceptFemale) genderAllowed.push("female");

    startTransition(async () => {
      await updateHomeProfile(home.id, {
        freeBeds,
        constraints: {
          minAge,
          maxAge,
          genderAllowed,
          notes: notes || undefined,
        },
        capabilities: {
          diabetesTrained,
          traumaInformed,
          adhdSupport,
          specialistStaff,
          mentalHealth,
        },
        isRegistered,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{home.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {home.location} &middot; Manage your home&apos;s profile, occupancy, and
          capabilities
        </p>
      </div>

      <div className="space-y-5">
        {/* Occupancy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="freeBeds">Available Beds</Label>
              <Input
                id="freeBeds"
                type="number"
                min={0}
                max={20}
                value={freeBeds}
                onChange={(e) => setFreeBeds(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Number of beds currently available for new placements
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ofsted Registration */}
        <Card className={!isRegistered ? "border-amber-300 bg-amber-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Ofsted Registration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Registered with Ofsted</div>
                <div className="text-xs text-muted-foreground">
                  Indicates whether this home is currently registered with Ofsted.
                  DoL placements require registered homes.
                </div>
              </div>
              <Switch checked={isRegistered} onCheckedChange={setIsRegistered} />
            </div>
            {!isRegistered && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Unregistered homes cannot accept Deprivation of Liberty placements.
                If a child is placed here, Ofsted must be notified within 7 days.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Acceptance Criteria */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Acceptance Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Age Range */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Age Range
              </Label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="space-y-1">
                  <Label htmlFor="minAge" className="text-xs">
                    Min
                  </Label>
                  <Input
                    id="minAge"
                    type="number"
                    min={0}
                    max={18}
                    value={minAge}
                    onChange={(e) => setMinAge(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </div>
                <span className="text-muted-foreground mt-5">to</span>
                <div className="space-y-1">
                  <Label htmlFor="maxAge" className="text-xs">
                    Max
                  </Label>
                  <Input
                    id="maxAge"
                    type="number"
                    min={0}
                    max={18}
                    value={maxAge}
                    onChange={(e) => setMaxAge(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </div>
                <Badge variant="outline" className="mt-5 text-xs">
                  {minAge}–{maxAge} years
                </Badge>
              </div>
            </div>

            {/* Gender */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gender Accepted
              </Label>
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={acceptMale}
                    onCheckedChange={setAcceptMale}
                  />
                  <span className="text-sm">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={acceptFemale}
                    onCheckedChange={setAcceptFemale}
                  />
                  <span className="text-sm">Female</span>
                </label>
              </div>
              {!acceptMale && !acceptFemale && (
                <p className="text-xs text-red-500 mt-1">
                  At least one gender must be accepted
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Quiet residential area, close to specialist school..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Staff Capabilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Staff Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Toggle the specialist capabilities your home currently has
              available. These are used to match referrals with appropriate
              care needs.
            </p>
            <div className="space-y-3">
              <CapabilityRow
                label="Diabetes Trained"
                description="Staff trained to manage diabetes care"
                checked={diabetesTrained}
                onCheckedChange={setDiabetesTrained}
              />
              <CapabilityRow
                label="Trauma Informed"
                description="Trauma-informed care approach and trained staff"
                checked={traumaInformed}
                onCheckedChange={setTraumaInformed}
              />
              <CapabilityRow
                label="ADHD Support"
                description="Dedicated ADHD support programme"
                checked={adhdSupport}
                onCheckedChange={setAdhdSupport}
              />
              <CapabilityRow
                label="Specialist Staff"
                description="On-site specialist staff (e.g., nurses, therapists)"
                checked={specialistStaff}
                onCheckedChange={setSpecialistStaff}
              />
              <CapabilityRow
                label="Mental Health"
                description="Mental health support and counselling available"
                checked={mentalHealth}
                onCheckedChange={setMentalHealth}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isPending || (!acceptMale && !acceptFemale)}
            className="min-w-[140px]"
          >
            {isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved — coordinator suggestions updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CapabilityRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
