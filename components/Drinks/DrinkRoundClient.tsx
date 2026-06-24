"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DrinkItem,
  DrinkRound,
  DrinkRoundSelection,
} from "@/lib/database.types";

export type DrinkMember = {
  user_id: string;
  display_name: string;
  image_url: string;
  marker_color: string;
};

type Props = {
  userId: string;
  members: DrinkMember[];
  items: DrinkItem[];
  initialRound: DrinkRound | null;
  initialSelections: DrinkRoundSelection[];
};

const DRINK_CATEGORIES = [
  "Bier",
  "Fris",
  "Water",
  "Mixdrank",
  "Wijn",
  "Overig",
] as const;

function selectionKey(recipientId: string, drinkItemId: number) {
  return `${recipientId}:${drinkItemId}`;
}

export default function DrinkRoundClient({
  userId,
  members,
  items,
  initialRound,
  initialSelections,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [menuItems, setMenuItems] = useState(items);
  const [activeRound, setActiveRound] = useState(initialRound);
  const [selections, setSelections] = useState(initialSelections);
  const [selectedRecipientId, setSelectedRecipientId] = useState(
    members.some((member) => member.user_id === userId)
      ? userId
      : (members[0]?.user_id ?? "")
  );
  const [pendingKeys, setPendingKeys] = useState(() => new Set<string>());
  const [roundPending, setRoundPending] = useState(false);
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkCategory, setNewDrinkCategory] =
    useState<(typeof DRINK_CATEGORIES)[number]>("Overig");
  const [addingDrink, setAddingDrink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members]
  );
  const itemById = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item])),
    [menuItems]
  );
  const quantityByKey = useMemo(
    () =>
      new Map(
        selections.map((selection) => [
          selectionKey(selection.recipient_id, selection.drink_item_id),
          selection.quantity,
        ])
      ),
    [selections]
  );
  const groupedItems = useMemo(() => {
    const groups = new Map<string, DrinkItem[]>();
    for (const item of menuItems) {
      const category = groups.get(item.category) ?? [];
      category.push(item);
      groups.set(item.category, category);
    }
    return [...groups.entries()];
  }, [menuItems]);

  const refreshMenu = useCallback(async () => {
    const { data, error: menuError } = await supabase
      .from("drink_items")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (menuError) {
      setError("De drankkaart kon niet worden ververst.");
      return;
    }
    setMenuItems(data ?? []);
  }, [supabase]);

  const refreshRound = useCallback(async () => {
    const { data: round, error: roundError } = await supabase
      .from("drink_rounds")
      .select("*")
      .in("status", ["open", "collecting"])
      .maybeSingle();

    if (roundError) {
      setError("Het rondje kon niet worden ververst.");
      return;
    }

    setActiveRound(round);
    if (!round) {
      setSelections([]);
      return;
    }

    const { data, error: selectionsError } = await supabase
      .from("drink_round_selections")
      .select("*")
      .eq("round_id", round.id);

    if (selectionsError) {
      setError("De bestellingen konden niet worden ververst.");
      return;
    }
    setSelections(data ?? []);
  }, [supabase]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refreshRound, 150);
    };
    const channel = supabase
      .channel("drink-round-screen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drink_items" },
        refreshMenu
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drink_rounds" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drink_round_selections" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refreshMenu, refreshRound, supabase]);

  async function startRound() {
    setRoundPending(true);
    setError(null);
    const { error: startError } = await supabase.rpc("start_drink_round");
    setRoundPending(false);
    if (startError) {
      setError(startError.message);
      await refreshRound();
      return;
    }
    await refreshRound();
  }

  async function changeQuantity(drinkItemId: number, delta: -1 | 1) {
    if (!activeRound || activeRound.status !== "open") return;
    const key = selectionKey(selectedRecipientId, drinkItemId);
    if (pendingKeys.has(key)) return;

    setError(null);
    setPendingKeys((current) => new Set(current).add(key));
    const { data, error: changeError } = await supabase.rpc(
      "change_drink_quantity",
      {
        p_round_id: activeRound.id,
        p_recipient_id: selectedRecipientId,
        p_drink_item_id: drinkItemId,
        p_delta: delta,
      }
    );
    setPendingKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });

    if (changeError) {
      setError(changeError.message);
      await refreshRound();
      return;
    }

    const quantity = data ?? 0;
    setSelections((current) => {
      const withoutCurrent = current.filter(
        (selection) =>
          selection.recipient_id !== selectedRecipientId ||
          selection.drink_item_id !== drinkItemId
      );
      if (quantity === 0) return withoutCurrent;
      return [
        ...withoutCurrent,
        {
          round_id: activeRound.id,
          recipient_id: selectedRecipientId,
          drink_item_id: drinkItemId,
          quantity,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
      ];
    });
  }

  async function advanceRound() {
    if (!activeRound) return;
    setRoundPending(true);
    setError(null);
    const { error: advanceError } = await supabase.rpc("advance_drink_round", {
      p_round_id: activeRound.id,
    });
    setRoundPending(false);
    if (advanceError) {
      setError(advanceError.message);
      await refreshRound();
      return;
    }
    await refreshRound();
  }

  async function addDrinkItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newDrinkName.trim();
    if (name.length < 2) {
      setError("Vul een dranknaam van minimaal twee tekens in.");
      return;
    }

    setAddingDrink(true);
    setError(null);
    const { data, error: addError } = await supabase.rpc("add_drink_item", {
      p_name: name,
      p_category: newDrinkCategory,
    });
    setAddingDrink(false);

    if (addError) {
      setError(addError.message);
      return;
    }

    if (data) {
      setMenuItems((current) =>
        [...current.filter((item) => item.id !== data.id), data].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );
    }
    setNewDrinkName("");
  }

  const collector = activeRound
    ? memberById.get(activeRound.collector_id)
    : null;
  const isCollector = activeRound?.collector_id === userId;
  const isOpen = activeRound?.status === "open";

  const ordersByMember = members.flatMap((member) => {
    const orders = selections
      .filter((selection) => selection.recipient_id === member.user_id)
      .flatMap((selection) => {
        const item = itemById.get(selection.drink_item_id);
        return item ? [{ item, quantity: selection.quantity }] : [];
      })
      .sort((a, b) => a.item.sort_order - b.item.sort_order);
    return orders.length > 0 ? [{ member, orders }] : [];
  });

  const totals = menuItems.flatMap((item) => {
    const quantity = selections
      .filter((selection) => selection.drink_item_id === item.id)
      .reduce((sum, selection) => sum + selection.quantity, 0);
    return quantity > 0 ? [{ item, quantity }] : [];
  });

  if (!activeRound) {
    return (
      <section className="mx-auto flex min-h-[65dvh] max-w-lg flex-col items-center justify-center text-center">
        <div className="text-6xl" aria-hidden>
          🍻
        </div>
        <h1 className="mt-5 font-display text-3xl sm:text-4xl">
          Wie haalt er een rondje?
        </h1>
        <p className="mt-3 max-w-md text-cream/70">
          Start een rondje en laat iedereen live zijn bestelling op het
          gezamenlijke dienblad zetten.
        </p>
        <button
          type="button"
          onClick={startRound}
          disabled={roundPending}
          className="mt-7 rounded-xl bg-gold px-6 py-3 font-semibold text-forest-950 shadow-lg transition hover:bg-gold-bright disabled:opacity-50"
        >
          {roundPending ? "Rondje starten…" : "Ik haal een rondje"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="rounded-2xl bg-forest-900 p-4 ring-1 ring-gold/20 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {collector && (
                <Image
                  src={collector.image_url}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full bg-cream ring-2 ring-gold"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold-bright">
                  {isOpen ? "Rondje staat open" : "Bestelling wordt gehaald"}
                </p>
                <h1 className="font-display text-xl normal-case tracking-normal sm:text-2xl">
                  {collector?.display_name ?? "Een konijn"} haalt het rondje
                </h1>
              </div>
            </div>
            {isCollector && (
              <button
                type="button"
                onClick={advanceRound}
                disabled={roundPending}
                className="shrink-0 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
              >
                {roundPending
                  ? "Bezig…"
                  : isOpen
                    ? "Ik ga halen"
                    : "Rondje is er"}
              </button>
            )}
          </div>
          {!isOpen && (
            <p className="mt-4 rounded-xl bg-amber-950/40 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-300/25">
              De bestelling is vergrendeld. De haler is onderweg naar de bar.
            </p>
          )}
          {error && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-forest-900 p-4 ring-1 ring-gold/20 sm:p-5">
          <h2 className="font-display text-lg">Voor wie?</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {members.map((member) => {
              const selected = selectedRecipientId === member.user_id;
              const memberTotal = selections
                .filter(
                  (selection) => selection.recipient_id === member.user_id
                )
                .reduce((sum, selection) => sum + selection.quantity, 0);
              return (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => setSelectedRecipientId(member.user_id)}
                  className={`relative flex w-24 shrink-0 flex-col items-center rounded-xl p-2.5 text-center transition ring-2 ${
                    selected
                      ? "bg-cream text-forest-950 ring-gold"
                      : "bg-forest-800 text-cream ring-transparent hover:ring-cream/25"
                  }`}
                >
                  <Image
                    src={member.image_url}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full bg-cream"
                    style={{
                      boxShadow: `0 0 0 2px ${member.marker_color}`,
                    }}
                  />
                  <span className="mt-2 w-full truncate text-sm font-semibold normal-case">
                    {member.display_name}
                  </span>
                  {memberTotal > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-bold text-forest-950">
                      {memberTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-forest-900 p-4 ring-1 ring-gold/20 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-bright">
                Drankkaart
              </p>
              <h2 className="mt-1 font-display text-xl">
                {memberById.get(selectedRecipientId)?.display_name ??
                  "Kies een konijn"}
              </h2>
            </div>
            {!isOpen && (
              <span className="text-xs font-semibold uppercase tracking-wide text-cream/50">
                Vergrendeld
              </span>
            )}
          </div>

          <div className="mt-5 space-y-6">
            {groupedItems.map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="mb-2 text-sm text-cream/60">{category}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categoryItems.map((item) => {
                    const key = selectionKey(selectedRecipientId, item.id);
                    const quantity = quantityByKey.get(key) ?? 0;
                    const pending = pendingKeys.has(key);
                    return (
                      <div
                        key={item.id}
                        className={`flex min-h-14 items-center gap-2 rounded-xl px-3 py-2 ring-1 ${
                          quantity > 0
                            ? "bg-cream text-forest-950 ring-gold"
                            : "bg-forest-800 ring-cream/10"
                        }`}
                      >
                        <span className="min-w-0 flex-1 font-semibold">
                          {item.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Eén ${item.name} minder`}
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={!isOpen || quantity === 0 || pending}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest-950 text-xl text-cream transition hover:bg-forest-700 disabled:opacity-25"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Eén ${item.name} meer`}
                          onClick={() => changeQuantity(item.id, 1)}
                          disabled={!isOpen || quantity >= 20 || pending}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-xl text-forest-950 transition hover:bg-gold-bright disabled:opacity-25"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {isOpen && (
              <details className="rounded-xl bg-forest-800 p-4 ring-1 ring-cream/10">
                <summary className="cursor-pointer font-semibold text-gold-bright">
                  Drankje ontbreekt? Voeg het toe
                </summary>
                <form
                  onSubmit={addDrinkItem}
                  className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
                >
                  <label className="text-sm">
                    <span className="mb-1 block text-cream/65">Naam</span>
                    <input
                      type="text"
                      value={newDrinkName}
                      onChange={(event) => setNewDrinkName(event.target.value)}
                      minLength={2}
                      maxLength={60}
                      required
                      placeholder="Bijvoorbeeld speciaalbier"
                      className="w-full rounded-lg bg-forest-950 px-3 py-2 text-cream outline-none ring-1 ring-cream/15 placeholder:text-cream/35 focus:ring-gold"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-cream/65">Categorie</span>
                    <select
                      value={newDrinkCategory}
                      onChange={(event) =>
                        setNewDrinkCategory(
                          event.target
                            .value as (typeof DRINK_CATEGORIES)[number]
                        )
                      }
                      className="w-full rounded-lg bg-forest-950 px-3 py-2 text-cream outline-none ring-1 ring-cream/15 focus:ring-gold"
                    >
                      {DRINK_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={addingDrink}
                    className="self-end rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
                  >
                    {addingDrink ? "Toevoegen…" : "Toevoegen"}
                  </button>
                </form>
                <p className="mt-3 text-xs text-cream/50">
                  Het drankje blijft op de kaart staan en verschijnt direct bij
                  alle konijnen.
                </p>
              </details>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <section className="rounded-2xl bg-cream p-5 text-forest-950 shadow-xl">
          <h2 className="font-display text-xl">Voor de bar</h2>
          {totals.length === 0 ? (
            <p className="mt-3 text-sm opacity-65">
              Nog niets besteld. Tik een drankje aan om het rondje te vullen.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {totals.map(({ item, quantity }) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-forest-950/10 pb-2"
                >
                  <span>{item.name}</span>
                  <span className="font-bold tabular-nums">{quantity}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-forest-900 p-5 ring-1 ring-gold/20">
          <h2 className="font-display text-xl">Per konijn</h2>
          {ordersByMember.length === 0 ? (
            <p className="mt-3 text-sm text-cream/60">
              De persoonlijke bestellingen verschijnen hier.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {ordersByMember.map(({ member, orders }) => (
                <div key={member.user_id} className="flex gap-3">
                  <Image
                    src={member.image_url}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full bg-cream"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold normal-case">
                      {member.display_name}
                    </p>
                    <p className="text-sm leading-snug text-cream/65">
                      {orders
                        .map(
                          ({ item, quantity }) =>
                            `${quantity}× ${item.name.toLowerCase()}`
                        )
                        .join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
