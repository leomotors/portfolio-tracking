"use client";

import { Building2, ExternalLink, Map, MapPin, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Delta } from "@/components/app/delta";
import { EditableNumber } from "@/components/app/editable-number";
import { Kpi, KpiGrid } from "@/components/app/kpi";
import { PageHeader } from "@/components/app/page-header";
import { Stale } from "@/components/app/stale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateRealEstateCurrentValue,
  updateRealEstatePurchaseCost,
} from "@/lib/db/actions";
import type { RealEstateProperty } from "@/lib/db/queries";
import {
  CLASS_COLOR,
  CLASS_LABEL,
  RISK_COLOR,
  RISK_LABEL,
} from "@/lib/portfolio/colors";
import { compactThb, num, pct, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

interface RealEstateClientProps {
  properties: RealEstateProperty[];
}

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  condominium: "Condominium",
  detached_house: "Detached House",
  townhouse: "Townhouse",
  land: "Land",
  commercial: "Commercial",
  other: "Other",
};

export function RealEstateClient({ properties }: RealEstateClientProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    properties[0]?.id ?? null,
  );

  const totals = useMemo(() => {
    const value = properties.reduce((sum, p) => sum + p.marketValue, 0);
    const cost = properties.reduce((sum, p) => sum + p.costValue, 0);
    const delta = value - cost;
    const deltaPct = cost === 0 ? 0 : delta / cost;
    return { value, cost, delta, deltaPct };
  }, [properties]);

  const selected =
    properties.find((property) => property.id === selectedId) ??
    properties[0] ??
    null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Real estate"
        title="Properties"
        sub={`${properties.length} ${properties.length === 1 ? "property" : "properties"} tracked separately from investments`}
      />

      {properties.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex max-w-[720px] flex-col gap-2">
              <div className="flex items-center gap-2 text-[14px] font-medium">
                <Building2 size={16} strokeWidth={2} />
                No properties yet
              </div>
              <p className="m-0 text-[13px] leading-5 text-[var(--ink-2)]">
                Add rows to <code className="num">real_estate_property</code> to
                track purchase cost, market value, location, and allocation
                here. Values are updated manually; the cron only snapshots daily
                balances.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <KpiGrid layout="4up">
            <Kpi label="Market value" value={thb(totals.value)} />
            <Kpi label="Purchase cost" value={thb(totals.cost)} />
            <Kpi
              label="Unrealized P/L"
              value={thb(totals.delta)}
              delta={totals.delta}
              pct={totals.deltaPct}
            />
            <Kpi
              label="Average property"
              value={compactThb(totals.value / properties.length)}
              sub={`${properties.length} total`}
            />
          </KpiGrid>

          <Tabs defaultValue="properties" className="flex flex-col gap-3">
            <TabsList>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
            </TabsList>

            <TabsContent value="properties">
              <PropertyTable
                properties={properties}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
              />
            </TabsContent>

            <TabsContent value="map">
              <MapPanel
                properties={properties}
                selected={selected}
                onSelect={setSelectedId}
              />
            </TabsContent>

            <TabsContent value="valuation">
              <ValuationPanel properties={properties} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function PropertyTable({
  properties,
  selectedId,
  onSelect,
}: {
  properties: RealEstateProperty[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Property list</CardTitle>
          <CardDescription>
            Standalone real-estate holdings sorted by market value
          </CardDescription>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr>
              <Th>Property</Th>
              <Th>Type</Th>
              <Th>Class</Th>
              <Th align="right">Cost</Th>
              <Th align="right">Value</Th>
              <Th align="right">P/L</Th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => {
              const delta = property.marketValue - property.costValue;
              const deltaPct =
                property.costValue === 0 ? 0 : delta / property.costValue;
              return (
                <tr
                  key={property.id}
                  className={cn(
                    "cursor-pointer hover:bg-[var(--hover)]",
                    selectedId === property.id && "bg-[var(--accent-soft)]",
                  )}
                  onClick={() => onSelect(property.id)}
                >
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold">{property.name}</span>
                      <span className="text-[12px] text-[var(--ink-3)]">
                        {property.address ?? "No address"}
                      </span>
                    </div>
                  </Td>
                  <Td>{PROPERTY_TYPE_LABEL[property.propertyType]}</Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: `${RISK_COLOR[property.riskLevel] ?? CLASS_COLOR.real_estate}20`,
                        color: RISK_COLOR[property.riskLevel],
                      }}
                    >
                      {RISK_LABEL[property.riskLevel] ?? property.riskLevel}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num">{thb(property.costValue)}</span>
                  </Td>
                  <Td align="right">
                    <span className="num">
                      {thb(property.marketValue)}
                      <Stale date={property.valueUpdatedAt} />
                    </span>
                  </Td>
                  <Td align="right">
                    <Delta value={delta} pct={deltaPct} mini />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function mapsEmbedUrl(property: RealEstateProperty): string | null {
  if (property.latitude != null && property.longitude != null) {
    return `https://www.google.com/maps?q=${property.latitude},${property.longitude}&z=14&output=embed`;
  }
  if (property.address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(property.address)}&z=14&output=embed`;
  }
  return null;
}

function mapsExternalUrl(property: RealEstateProperty): string | null {
  if (property.latitude != null && property.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`;
  }
  if (property.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
  }
  return null;
}

function MapPanel({
  properties,
  selected,
  onSelect,
}: {
  properties: RealEstateProperty[];
  selected: RealEstateProperty | null;
  onSelect: (id: number) => void;
}) {
  const mapSrc = selected ? mapsEmbedUrl(selected) : null;
  const externalHref = selected ? mapsExternalUrl(selected) : null;

  return (
    <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Select a property to inspect</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {properties.map((property) => (
            <button
              key={property.id}
              type="button"
              onClick={() => onSelect(property.id)}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
                selected?.id === property.id
                  ? "border-[var(--accent-pri)] bg-[var(--accent-soft)]"
                  : "border-[var(--hairline)] bg-[var(--surface)] hover:bg-[var(--hover)]",
              )}
            >
              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-[var(--surface-2)] text-[var(--ink-2)]">
                <MapPin size={15} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">
                  {property.name}
                </span>
                <span className="block truncate text-[12px] text-[var(--ink-3)]">
                  {coordinateLabel(property)}
                </span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{selected?.name ?? "Map"}</CardTitle>
            <CardDescription>
              {selected ? coordinateLabel(selected) : "No location selected"}
            </CardDescription>
          </div>
          {externalHref && (
            <Button asChild variant="outline" size="sm">
              <a href={externalHref} target="_blank" rel="noreferrer">
                <ExternalLink size={14} strokeWidth={2} />
                Open map
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {mapSrc ? (
            <iframe
              title={`Map for ${selected?.name ?? "property"}`}
              src={mapSrc}
              className="h-[420px] w-full rounded-[var(--radius)] border border-[var(--hairline)]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-[var(--radius)] border border-dashed border-[var(--hairline)] bg-[var(--surface-2)] p-6 text-center">
              <div className="flex max-w-[420px] flex-col items-center gap-2">
                <Map size={22} strokeWidth={1.8} />
                <div className="text-[14px] font-medium">No location data</div>
                <p className="m-0 text-[12px] leading-5 text-[var(--ink-2)]">
                  Add coordinates or an address to this property to show the
                  map.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ValuationPanel({ properties }: { properties: RealEstateProperty[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {properties.map((property) => {
        const delta = property.marketValue - property.costValue;
        const deltaPct =
          property.costValue === 0 ? 0 : delta / property.costValue;
        return (
          <Card key={property.id}>
            <CardHeader>
              <div>
                <CardTitle>{property.name}</CardTitle>
                <CardDescription>
                  {PROPERTY_TYPE_LABEL[property.propertyType]} ·{" "}
                  {CLASS_LABEL.real_estate} · {property.currency}
                </CardDescription>
              </div>
              <TrendingUp size={17} strokeWidth={1.8} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Stat
                  label="Market value (THB)"
                  value={thb(property.marketValue)}
                />
                <Stat
                  label="Purchase cost (THB)"
                  value={thb(property.costValue)}
                />
                <Stat
                  label="Unrealized P/L"
                  value={thb(delta)}
                  detail={pct(deltaPct)}
                />
                <Stat
                  label="Area"
                  value={
                    property.areaSqm == null
                      ? "Not set"
                      : `${num(property.areaSqm, 2)} sqm`
                  }
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="text-[12px] text-[var(--ink-3)]">
                    Market value ({property.currency})
                  </div>
                  <EditableNumber
                    value={property.currentValue}
                    prefix=""
                    suffix={` ${property.currency}`}
                    decimals={2}
                    ariaLabel={`Edit market value for ${property.name}`}
                    onSave={(v) => updateRealEstateCurrentValue(property.id, v)}
                  />
                  <Stale date={property.valueUpdatedAt} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="text-[12px] text-[var(--ink-3)]">
                    Purchase cost ({property.currency})
                  </div>
                  <EditableNumber
                    value={property.purchaseCost}
                    prefix=""
                    suffix={` ${property.currency}`}
                    decimals={2}
                    ariaLabel={`Edit purchase cost for ${property.name}`}
                    onSave={(v) => updateRealEstatePurchaseCost(property.id, v)}
                  />
                </div>
                <Stat
                  label="Acquired"
                  value={
                    property.acquiredAt
                      ? new Date(
                          property.acquiredAt + "T00:00:00",
                        ).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                        })
                      : "Not set"
                  }
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-[12px] text-[var(--ink-3)]">{label}</div>
      <div className="num truncate text-[18px] font-medium">{value}</div>
      {detail && (
        <div className="text-[11px] text-[var(--ink-3)]">{detail}</div>
      )}
    </div>
  );
}

function coordinateLabel(property: RealEstateProperty) {
  if (property.latitude != null && property.longitude != null) {
    return `${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}`;
  }
  return property.address ?? "No coordinates";
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--hairline-2)] px-4 py-3 align-middle",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </td>
  );
}
