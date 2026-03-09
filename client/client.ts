import BN from "bn.js";
import * as web3 from "@solana/web3.js";
// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { AntojitosMexicanos } from "../target/types/antojitos_mexicanos";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.AntojitosMexicanos as anchor.Program<AntojitosMexicanos>;


const program = program;
const wallet = pg.wallet;

// Helpers PDA
async function getRestaurantePDA(): Promise<PublicKey> {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("restaurante"), wallet.publicKey.toBuffer()],
    program.programId
  );
  return pda;
}

async function getItemPDA(
  restaurantePDA: PublicKey,
  itemId: number
): Promise<PublicKey> {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(itemId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("item"), restaurantePDA.toBuffer(), idBuffer],
    program.programId
  );
  return pda;
}

// INICIALIZAR
async function inicializarRestaurante(nombre: string) {
  const restaurantePDA = await getRestaurantePDA();
  const tx = await program.methods
    .inicializarRestaurante(nombre)
    .accounts({
      restaurante: restaurantePDA,
      dueno: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return tx;
}

// CREATE
async function crearItem(
  nombre: string,
  descripcion: string,
  precio: number,
  categoria: object,
  disponible: boolean
) {
  const restaurantePDA = await getRestaurantePDA();
  const restaurante = await program.account.restauranteAccount.fetch(
    restaurantePDA
  );
  const nextId = restaurante.totalItems.toNumber();
  const itemPDA = await getItemPDA(restaurantePDA, nextId);

  const tx = await program.methods
    .crearItem(nombre, descripcion, new BN(precio), categoria, disponible)
    .accounts({
      itemMenu: itemPDA,
      restaurante: restaurantePDA,
      dueno: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return { tx, itemPDA };
}

// READ - un item
async function obtenerItem(itemId: number) {
  const restaurantePDA = await getRestaurantePDA();
  const itemPDA = await getItemPDA(restaurantePDA, itemId);
  return await program.account.itemMenuAccount.fetch(itemPDA);
}

// READ - menu completo
async function obtenerMenu() {
  const restaurantePDA = await getRestaurantePDA();
  const restaurante = await program.account.restauranteAccount.fetch(
    restaurantePDA
  );
  const total = restaurante.totalItems.toNumber();
  const items = [];

  for (let i = 0; i < total; i++) {
    try {
      const itemPDA = await getItemPDA(restaurantePDA, i);
      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      items.push(item);
    } catch {
      // item eliminado
    }
  }
  return items;
}

// UPDATE
async function actualizarItem(
  itemId: number,
  nombre: string | null,
  descripcion: string | null,
  precio: number | null,
  categoria: object | null,
  disponible: boolean | null
) {
  const restaurantePDA = await getRestaurantePDA();
  const itemPDA = await getItemPDA(restaurantePDA, itemId);

  const tx = await program.methods
    .actualizarItem(
      nombre,
      descripcion,
      precio ? new BN(precio) : null,
      categoria,
      disponible
    )
    .accounts({
      itemMenu: itemPDA,
      restaurante: restaurantePDA,
      dueno: wallet.publicKey,
    })
    .rpc();
  return tx;
}

// DELETE
async function eliminarItem(itemId: number) {
  const restaurantePDA = await getRestaurantePDA();
  const itemPDA = await getItemPDA(restaurantePDA, itemId);

  const tx = await program.methods
    .eliminarItem()
    .accounts({
      itemMenu: itemPDA,
      restaurante: restaurantePDA,
      dueno: wallet.publicKey,
    })
    .rpc();
  return tx;
}
