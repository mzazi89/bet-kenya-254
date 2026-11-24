import { query, withTransaction } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

export type Mode = "demo" | "account";
export type KycStatus = "unverified" | "pending" | "verified";

export class AppError extends Error {}

export type Limits = { dailyDeposit: number; dailyLoss: number; realityCheckMin: number };

export type Snapshot = {
  profile: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    dob: string | null;
    isGuest: boolean;
    kyc: KycStatus;
    kycRef: string | null;
    idNumber: string | null;
    twoFactor: boolean;
    selfExcludedUntil: number | null;
    createdAt: number;
    limits: Limits;
  } | null;
  wallets: Record<
    Mode,
    {
      balance: number;
      depositedToday: number;
      stakedToday: number;
      wonToday: number;
      transactions: Array<{ id: string; label: string; amount: number; kind: string; at: number }>;
      tickets: Array<{
        id: string;
        stake: number;
        odds: number;
        status: "pending" | "won" | "lost";
        payout: number;
        placedAt: number;
        legs: Array<{ id: string; match: string; market: string; pick: string; odds: number }>;
      }>;
      aviatorBets: Array<{
        id: string;
        roundId: number;
        stake: number;
        cashout: number | null;
        payout: number;
        status: string;
        at: number;
      }>;
    }
  >;
  withdrawals: Array<{
    id: string;
    amount: number;
    method: string;
    destination: string;
    status: "pending" | "paid";
    at: number;
  }>;
  serverTime: number;
};

const DEMO_START = 5000;
const MIN_STAKE = 10;
const MAX_STAKE = 25000;

const money = (value: unknown) => Number(value ?? 0);

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: Date | null;
  dob_text: string | null;
  is_guest: boolean;
  kyc_status: KycStatus;
  kyc_ref: string | null;
  id_number: string | null;
  self_excluded_until: Date | null;
  two_factor: boolean;
  created_at: Date;
};

type WalletRow = {
  id: string;
  mode: Mode;
  balance: string;
  deposited_today: string;
  staked_today: string;
  won_today: string;
};

async function ensureDemoWallet(userId: string) {
  await query(
    `insert into wallets (user_id, mode, balance) values ($1, 'demo', $2)
     on conflict (user_id, mode) do nothing`,
    [userId, DEMO_START],
  );
}

export async function ensureGuest(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into users (name, is_guest) values ('Guest', true) returning id`,
  );
  const userId = rows[0].id;
  await query(`insert into limits (user_id) values ($1) on conflict do nothing`, [userId]);
  await ensureDemoWallet(userId);
  return userId;
}

async function loadUser(userId: string): Promise<UserRow> {
  const { rows } = await query<UserRow>(
    `select *, to_char(dob, 'YYYY-MM-DD') as dob_text from users where id = $1`,
    [userId],
  );
  if (!rows[0]) throw new AppError("Account not found");
  return rows[0];
}

async function loadLimits(userId: string): Promise<Limits> {
  const { rows } = await query<{
    daily_deposit: string;
    daily_loss: string;
    reality_check_min: number;
  }>(`select * from limits where user_id = $1`, [userId]);
  if (!rows[0]) return { dailyDeposit: 10000, dailyLoss: 5000, realityCheckMin: 30 };
  return {
    dailyDeposit: money(rows[0].daily_deposit),
    dailyLoss: money(rows[0].daily_loss),
    realityCheckMin: rows[0].reality_check_min,
  };
}

export async function snapshot(userId: string): Promise<Snapshot> {
  const [user, limits, walletsRes, withdrawalsRes] = await Promise.all([
    loadUser(userId),
    loadLimits(userId),
    query<WalletRow & { id: string }>(
      `select id, mode, balance, deposited_today, staked_today, won_today from wallets where user_id = $1`,
      [userId],
    ),
    query<{
      id: string;
      amount: string;
      method: string;
      destination: string;
      status: "pending" | "paid";
      created_at: Date;
    }>(
      `select id, amount, method, destination, status, created_at from withdrawals
        where user_id = $1 order by created_at desc limit 20`,
      [userId],
    ),
  ]);

  const walletIds = walletsRes.rows.map((w) => w.id);

  const txPromise = walletIds.length
    ? query<{
        id: string;
        wallet_id: string;
        label: string;
        amount: string;
        kind: string;
        created_at: Date;
      }>(
        `select id, wallet_id, label, amount, kind, created_at
           from transactions where wallet_id = any($1::uuid[])
          order by created_at desc limit 120`,
        [walletIds],
      )
    : Promise.resolve({ rows: [] });

  const ticketPromise = walletIds.length
    ? query<{
        id: string;
        wallet_id: string;
        stake: string;
        odds: string;
        status: "pending" | "won" | "lost";
        payout: string;
        placed_at: Date;
        legs: Array<{ id: string; match: string; market: string; pick: string; odds: number }>;
      }>(
        `select t.id, t.wallet_id, t.stake, t.odds, t.status, t.payout, t.placed_at,
                coalesce(
                  json_agg(
                    json_build_object('id', l.id, 'match', l.match, 'market', l.market,
                                      'pick', l.pick, 'odds', l.odds)
                  ) filter (where l.id is not null),
                  '[]'
                ) as legs
           from tickets t
           left join ticket_legs l on l.ticket_id = t.id
          where t.wallet_id = any($1::uuid[])
          group by t.id
          order by t.placed_at desc limit 40`,
        [walletIds],
      )
    : Promise.resolve({ rows: [] });

  const betPromise = walletIds.length
    ? query<{
        id: string;
        wallet_id: string;
        round_id: number;
        stake: string;
        cashout: string | null;
        payout: string | null;
        status: string;
        created_at: Date;
      }>(
        `select id, wallet_id, round_id, stake, cashout, payout, status, created_at
           from aviator_bets where wallet_id = any($1::uuid[])
          order by created_at desc limit 40`,
        [walletIds],
      )
    : Promise.resolve({ rows: [] });

  const [txRes, ticketRes, betRes] = await Promise.all([txPromise, ticketPromise, betPromise]);

  const emptyWallet = {
    balance: 0,
    depositedToday: 0,
    stakedToday: 0,
    wonToday: 0,
    transactions: [],
    tickets: [],
    aviatorBets: [],
  };

  const wallets: Snapshot["wallets"] = {
    demo: { ...emptyWallet },
    account: { ...emptyWallet },
  };

  for (const wallet of walletsRes.rows) {
    const mode = wallet.mode;
    wallets[mode] = {
      balance: money(wallet.balance),
      depositedToday: money(wallet.deposited_today),
      stakedToday: money(wallet.staked_today),
      wonToday: money(wallet.won_today),
      transactions: txRes.rows
        .filter((tx) => tx.wallet_id === wallet.id)
        .map((tx) => ({
          id: tx.id,
          label: tx.label,
          amount: money(tx.amount),
          kind: tx.kind,
          at: new Date(tx.created_at).getTime(),
        })),
      tickets: ticketRes.rows
        .filter((ticket) => ticket.wallet_id === wallet.id)
        .map((ticket) => ({
          id: ticket.id,
          stake: money(ticket.stake),
          odds: money(ticket.odds),
          status: ticket.status,
          payout: money(ticket.payout),
          placedAt: new Date(ticket.placed_at).getTime(),
          legs: ticket.legs.map((leg) => ({
              id: leg.id,
              match: leg.match,
              market: leg.market,
              pick: leg.pick,
              odds: money(leg.odds),
            })),
        })),
      aviatorBets: betRes.rows
        .filter((bet) => bet.wallet_id === wallet.id)
        .map((bet) => ({
          id: bet.id,
          roundId: bet.round_id,
          stake: money(bet.stake),
          cashout: bet.cashout === null ? null : money(bet.cashout),
          payout: money(bet.payout),
          status: bet.status,
          at: new Date(bet.created_at).getTime(),
        })),
    };
  }

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob_text ?? null,
      isGuest: user.is_guest,
      kyc: user.kyc_status,
      kycRef: user.kyc_ref,
      idNumber: user.id_number,
      twoFactor: user.two_factor,
      selfExcludedUntil: user.self_excluded_until
        ? new Date(user.self_excluded_until).getTime()
        : null,
      createdAt: new Date(user.created_at).getTime(),
      limits,
    },
    wallets,
    withdrawals: withdrawalsRes.rows.map((w) => ({
      id: w.id,
      amount: money(w.amount),
      method: w.method,
      destination: w.destination,
      status: w.status,
      at: new Date(w.created_at).getTime(),
    })),
    serverTime: Date.now(),
  };
}

/* --------------------------------------------------------------- auth */

const emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const phoneRe = /^(?:\+254|0)(?:7|1)\d{8}$/;

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number";
  }
  return null;
}

export async function register(
  input: { name: string; email: string; phone: string; dob: string; password: string },
  currentUserId?: string,
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.replace(/[\s-]/g, "");

  if (input.name.trim().length < 3) throw new AppError("Enter your full name");
  if (!emailRe.test(email)) throw new AppError("Enter a valid email address");
  if (!phoneRe.test(phone)) throw new AppError("Use a Kenyan number, e.g. 0712 345 678");
  if (ageFromDob(input.dob) < 18) throw new AppError("You must be 18 or older");
  const pwProblem = passwordProblem(input.password);
  if (pwProblem) throw new AppError(pwProblem);

  const existing = await query(`select 1 from users where email = $1 and is_guest = false`, [email]);
  if (existing.rowCount) throw new AppError("An account with that email already exists");

  const passwordHash = await hashPassword(input.password);

  let userId = currentUserId;
  if (userId) {
    const guest = await query<{ is_guest: boolean }>(`select is_guest from users where id = $1`, [
      userId,
    ]);
    if (!guest.rows[0]?.is_guest) throw new AppError("Already signed in");
  }

  if (!userId) {
    const created = await query<{ id: string }>(
      `insert into users (name, email, phone, dob, password_hash, is_guest)
       values ($1, $2, $3, $4, $5, false) returning id`,
      [input.name.trim(), email, phone, input.dob, passwordHash],
    );
    userId = created.rows[0].id;
    await query(`insert into limits (user_id) values ($1) on conflict do nothing`, [userId]);
    await ensureDemoWallet(userId);
  } else {
    await query(
      `update users set name = $2, email = $3, phone = $4, dob = $5, password_hash = $6, is_guest = false
        where id = $1`,
      [userId, input.name.trim(), email, phone, input.dob, passwordHash],
    );
  }

  await query(
    `insert into wallets (user_id, mode, balance) values ($1, 'account', 0)
     on conflict (user_id, mode) do nothing`,
    [userId],
  );

  return userId;
}

export async function login(email: string, password: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  const { rows } = await query<{ id: string; password_hash: string | null }>(
    `select id, password_hash from users where email = $1 and is_guest = false limit 1`,
    [clean],
  );
  const user = rows[0];
  if (!user?.password_hash) throw new AppError("No account found for that email");
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new AppError("Incorrect password");
  return user.id;
}

/* ---------------------------------------------------------- mutations */

async function lockWallet(
  client: import("pg").PoolClient,
  userId: string,
  mode: Mode,
): Promise<WalletRow & { id: string }> {
  await client.query(
    `update wallets set deposited_today = 0, staked_today = 0, won_today = 0, day_key = current_date
      where user_id = $1 and day_key <> current_date`,
    [userId],
  );
  const { rows } = await client.query<WalletRow & { id: string }>(
    `select id, mode, balance, deposited_today, staked_today, won_today
       from wallets where user_id = $1 and mode = $2 for update`,
    [userId, mode],
  );
  if (!rows[0]) throw new AppError("Wallet not found");
  return rows[0];
}

async function assertCanBet(user: UserRow, wallet: WalletRow, limits: Limits) {
  if (user.self_excluded_until && new Date(user.self_excluded_until).getTime() > Date.now()) {
    throw new AppError("Self-exclusion is active on this account");
  }
  const lost = Math.max(0, money(wallet.staked_today) - money(wallet.won_today));
  if (lost >= limits.dailyLoss) throw new AppError("Daily loss limit reached");
}

export async function placeAviatorBet(
  userId: string,
  mode: Mode,
  roundId: number,
  stake: number,
): Promise<{ betId: string }> {
  const amount = Math.round(stake * 100) / 100;
  if (!(amount >= MIN_STAKE) || amount > MAX_STAKE) {
    throw new AppError(`Stake must be between KES ${MIN_STAKE} and KES ${MAX_STAKE}`);
  }
  const user = await loadUser(userId);
  const limits = await loadLimits(userId);

  return withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, mode);
    await assertCanBet(user, wallet, limits);
    if (money(wallet.balance) < amount) throw new AppError("Insufficient balance");

    await client.query(
      `update wallets set balance = balance - $2, staked_today = staked_today + $2 where id = $1`,
      [wallet.id, amount],
    );
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'bet')`,
      [wallet.id, `Aviator stake · round #${roundId}`, -amount],
    );
    const bet = await client.query<{ id: string }>(
      `insert into aviator_bets (wallet_id, round_id, stake, status) values ($1, $2, $3, 'open')
       returning id`,
      [wallet.id, roundId, amount],
    );
    return { betId: bet.rows[0].id };
  });
}

export async function settleAviatorBet(
  userId: string,
  betId: string,
  cashout: number | null,
): Promise<{ payout: number }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      wallet_id: string;
      stake: string;
      status: string;
    }>(`select id, wallet_id, stake, status from aviator_bets where id = $1 for update`, [betId]);
    const bet = rows[0];
    if (!bet) throw new AppError("Bet not found");
    if (bet.status !== "open") throw new AppError("Bet already settled");

    const owner = await client.query(
      `select 1 from wallets w join users u on u.id = w.user_id where w.id = $1 and u.id = $2`,
      [bet.wallet_id, userId],
    );
    if (!owner.rowCount) throw new AppError("Bet not found");

    const stake = money(bet.stake);
    const valid = cashout !== null && cashout >= 1 && cashout <= 5000;
    const payout = valid ? Math.round(stake * (cashout as number) * 100) / 100 : 0;

    await client.query(
      `update aviator_bets set cashout = $2, payout = $3, status = $4 where id = $1`,
      [betId, valid ? cashout : null, payout, valid ? "won" : "lost"],
    );

    if (payout > 0) {
      await client.query(
        `update wallets set balance = balance + $2, won_today = won_today + $2 where id = $1`,
        [bet.wallet_id, payout],
      );
      await client.query(
        `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'win')`,
        [bet.wallet_id, `Aviator cash out @ ${cashout}x`, payout],
      );
    }
    return { payout };
  });
}

export async function placeTicket(
  userId: string,
  mode: Mode,
  input: {
    stake: number;
    odds: number;
    legs: Array<{ match: string; market: string; pick: string; odds: number }>;
  },
): Promise<{ ticketId: string }> {
  const stake = Math.round(input.stake * 100) / 100;
  if (!(stake >= MIN_STAKE) || stake > MAX_STAKE) {
    throw new AppError(`Stake must be between KES ${MIN_STAKE} and KES ${MAX_STAKE}`);
  }
  if (!input.legs.length || input.legs.length > 8) throw new AppError("Add between 1 and 8 picks");
  if (!(input.odds >= 1.01) || input.odds > 500) throw new AppError("Invalid odds");

  const user = await loadUser(userId);
  const limits = await loadLimits(userId);

  return withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, mode);
    await assertCanBet(user, wallet, limits);
    if (money(wallet.balance) < stake) throw new AppError("Insufficient balance");

    await client.query(
      `update wallets set balance = balance - $2, staked_today = staked_today + $2 where id = $1`,
      [wallet.id, stake],
    );
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'bet')`,
      [
        wallet.id,
        `Bet slip · ${input.legs.length} leg${input.legs.length > 1 ? "s" : ""}`,
        -stake,
      ],
    );
    const ticket = await client.query<{ id: string }>(
      `insert into tickets (wallet_id, stake, odds) values ($1, $2, $3) returning id`,
      [wallet.id, stake, Math.round(input.odds * 100) / 100],
    );
    const ticketId = ticket.rows[0].id;
    for (const leg of input.legs) {
      await client.query(
        `insert into ticket_legs (ticket_id, match, market, pick, odds) values ($1, $2, $3, $4, $5)`,
        [ticketId, leg.match, leg.market, leg.pick, leg.odds],
      );
    }
    return { ticketId };
  });
}

export async function settleTicket(
  userId: string,
  ticketId: string,
): Promise<{ won: boolean; payout: number }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      wallet_id: string;
      stake: string;
      odds: string;
      status: string;
      placed_at: Date;
    }>(
      `select t.id, t.wallet_id, t.stake, t.odds, t.status, t.placed_at
         from tickets t join wallets w on w.id = t.wallet_id
        where t.id = $1 and w.user_id = $2 for update`,
      [ticketId, userId],
    );
    const ticket = rows[0];
    if (!ticket) throw new AppError("Slip not found");
    if (ticket.status !== "pending") throw new AppError("Slip already settled");

    const ageMs = Date.now() - new Date(ticket.placed_at).getTime();
    if (ageMs < 8000) throw new AppError("Slip is still open");

    const odds = money(ticket.odds);
    const won = Math.random() < 0.9 / Math.max(odds, 1.01);
    const payout = won ? Math.round(money(ticket.stake) * odds * 100) / 100 : 0;

    await client.query(
      `update tickets set status = $2, payout = $3, settled_at = now() where id = $1`,
      [ticketId, won ? "won" : "lost", payout],
    );

    if (payout > 0) {
      await client.query(
        `update wallets set balance = balance + $2, won_today = won_today + $2 where id = $1`,
        [ticket.wallet_id, payout],
      );
      await client.query(
        `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'win')`,
        [ticket.wallet_id, `Slip won · ${payout.toFixed(2)}`, payout],
      );
    }
    return { won, payout };
  });
}

export async function deposit(
  userId: string,
  amount: number,
  method: string,
): Promise<void> {
  const value = Math.round(amount * 100) / 100;
  const user = await loadUser(userId);
  if (user.is_guest) throw new AppError("Sign in to deposit");
  if (!(value >= 50)) throw new AppError("Minimum deposit is KES 50");
  const limits = await loadLimits(userId);

  await withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, "account");
    if (money(wallet.deposited_today) + value > limits.dailyDeposit) {
      throw new AppError(
        `That exceeds your daily deposit limit of KES ${limits.dailyDeposit.toLocaleString()}`,
      );
    }
    await client.query(
      `update wallets set balance = balance + $2, deposited_today = deposited_today + $2 where id = $1`,
      [wallet.id, value],
    );
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'deposit')`,
      [wallet.id, `Deposit · ${method} (simulated)`, value],
    );
  });
}

export async function withdraw(
  userId: string,
  amount: number,
  method: string,
  destination: string,
): Promise<void> {
  const value = Math.round(amount * 100) / 100;
  const user = await loadUser(userId);
  if (user.is_guest) throw new AppError("Sign in to withdraw");
  if (user.kyc_status !== "verified") throw new AppError("Verify your identity before withdrawing");
  if (!(value >= 500)) throw new AppError("Minimum withdrawal is KES 500");

  await withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, "account");
    if (money(wallet.balance) < value) throw new AppError("Insufficient balance");
    await client.query(`update wallets set balance = balance - $2 where id = $1`, [
      wallet.id,
      value,
    ]);
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, $2, $3, 'withdrawal')`,
      [wallet.id, `Withdrawal request · ${method}`, -value],
    );
    await client.query(
      `insert into withdrawals (user_id, wallet_id, amount, method, destination) values ($1, $2, $3, $4, $5)`,
      [userId, wallet.id, value, method, destination],
    );
  });
}

export async function topUpDemo(userId: string): Promise<void> {
  await ensureDemoWallet(userId);
  await withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, "demo");
    await client.query(`update wallets set balance = balance + 1000 where id = $1`, [wallet.id]);
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, 'Demo credits added', 1000, 'bonus')`,
      [wallet.id],
    );
  });
}

export async function resetDemo(userId: string): Promise<void> {
  await withTransaction(async (client) => {
    const wallet = await lockWallet(client, userId, "demo");
    await client.query(
      `update wallets set balance = $2, staked_today = 0, won_today = 0 where id = $1`,
      [wallet.id, DEMO_START],
    );
    await client.query(
      `insert into transactions (wallet_id, label, amount, kind) values ($1, 'Demo wallet reset', $2, 'reset')`,
      [wallet.id, DEMO_START],
    );
  });
}

export async function updateProfile(
  userId: string,
  patch: { name?: string; phone?: string },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [userId];
  if (patch.name !== undefined) {
    if (patch.name.trim().length < 3) throw new AppError("Enter your full name");
    values.push(patch.name.trim());
    sets.push(`name = $${values.length}`);
  }
  if (patch.phone !== undefined) {
    const phone = patch.phone.replace(/[\s-]/g, "");
    if (!phoneRe.test(phone)) throw new AppError("Use a Kenyan number");
    values.push(phone);
    sets.push(`phone = $${values.length}`);
  }
  if (!sets.length) return;
  await query(`update users set ${sets.join(", ")} where id = $1`, values);
}

export async function updateLimits(userId: string, patch: Partial<Limits>): Promise<void> {
  await query(
    `insert into limits (user_id, daily_deposit, daily_loss, reality_check_min)
     values ($1, coalesce($2, 10000), coalesce($3, 5000), coalesce($4, 30))
     on conflict (user_id) do update set
       daily_deposit = coalesce($2, limits.daily_deposit),
       daily_loss = coalesce($3, limits.daily_loss),
       reality_check_min = coalesce($4, limits.reality_check_min)`,
    [userId, patch.dailyDeposit ?? null, patch.dailyLoss ?? null, patch.realityCheckMin ?? null],
  );
}

export async function submitKyc(userId: string, fullName: string, idNumber: string): Promise<void> {
  if (fullName.trim().length < 3) throw new AppError("Enter your legal name");
  if (idNumber.trim().length < 5) throw new AppError("Enter a valid ID number");
  const ref = `KYC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await query(
    `update users set name = $2, id_number = $3, kyc_status = 'pending', kyc_ref = $4 where id = $1`,
    [userId, fullName.trim(), idNumber.trim(), ref],
  );
}

export async function approveKyc(userId: string): Promise<void> {
  await query(`update users set kyc_status = 'verified' where id = $1 and kyc_status = 'pending'`, [
    userId,
  ]);
}

export async function setSelfExclusion(userId: string, days: number): Promise<void> {
  if (days <= 0) {
    await query(`update users set self_excluded_until = null where id = $1`, [userId]);
    return;
  }
  await query(
    `update users set self_excluded_until = now() + ($2 || ' days')::interval where id = $1`,
    [userId, days],
  );
}

export async function toggleTwoFactor(userId: string): Promise<void> {
  await query(`update users set two_factor = not two_factor where id = $1`, [userId]);
}

export async function changePassword(
  userId: string,
  current: string,
  next: string,
): Promise<void> {
  const { rows } = await query<{ password_hash: string | null }>(
    `select password_hash from users where id = $1`,
    [userId],
  );
  if (!rows[0]?.password_hash) throw new AppError("This account has no password yet");
  const ok = await verifyPassword(current, rows[0].password_hash);
  if (!ok) throw new AppError("Current password is incorrect");
  const problem = passwordProblem(next);
  if (problem) throw new AppError(problem);
  const hash = await hashPassword(next);
  await query(`update users set password_hash = $2 where id = $1`, [userId, hash]);
}
