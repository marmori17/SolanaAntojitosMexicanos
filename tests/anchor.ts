import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import type { AntojitosMexicanos } from "../target/types/antojitos_mexicanos";

const program = program;
const wallet = pg.wallet;

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

describe("Antojos Mexicanos - CRUD con PDA", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AntojitosMexicanos as anchor.Program<AntojitosMexicanos>;
  
  const restauranteNombre = "Antojos Mexicanos Don Chuy";
  let restaurantePDA: PublicKey;

  before(async () => {
    restaurantePDA = await getRestaurantePDA();
  });

  it("Inicializa el restaurante", async () => {
    try {
      await program.methods
        .inicializarRestaurante(restauranteNombre)
        .accounts({
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch {
      // ya existe
    }

    const cuenta = await program.account.restauranteAccount.fetch(
      restaurantePDA
    );
    assert.equal(cuenta.nombre, restauranteNombre);
    assert.equal(cuenta.dueno.toBase58(), wallet.publicKey.toBase58());
  });

  describe("CREATE", () => {
    it("Crea un taco de pastor", async () => {
      const cuenta = await program.account.restauranteAccount.fetch(
        restaurantePDA
      );
      const nextId = cuenta.totalItems.toNumber();
      const itemPDA = await getItemPDA(restaurantePDA, nextId);

      await program.methods
        .crearItem(
          "Taco de Pastor",
          "Cerdo con achiote, pina, cilantro y cebolla",
          new BN(2500),
          { tacos: {} },
          true
        )
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.nombre, "Taco de Pastor");
      assert.equal(item.precio.toNumber(), 2500);
      assert.isTrue(item.disponible);
    });

    it("Crea una quesadilla de flor de calabaza", async () => {
      const cuenta = await program.account.restauranteAccount.fetch(
        restaurantePDA
      );
      const nextId = cuenta.totalItems.toNumber();
      const itemPDA = await getItemPDA(restaurantePDA, nextId);

      await program.methods
        .crearItem(
          "Quesadilla de Flor de Calabaza",
          "Tortilla con flor de calabaza y queso oaxaca",
          new BN(4500),
          { quesadillas: {} },
          true
        )
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.nombre, "Quesadilla de Flor de Calabaza");
    });

    it("Crea un elote preparado", async () => {
      const cuenta = await program.account.restauranteAccount.fetch(
        restaurantePDA
      );
      const nextId = cuenta.totalItems.toNumber();
      const itemPDA = await getItemPDA(restaurantePDA, nextId);

      await program.methods
        .crearItem(
          "Elote Preparado",
          "Con mayonesa, chile en polvo y limon",
          new BN(3000),
          { elotes: {} },
          true
        )
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.nombre, "Elote Preparado");
    });

    it("Falla si el nombre supera 50 caracteres", async () => {
      const cuenta = await program.account.restauranteAccount.fetch(
        restaurantePDA
      );
      const nextId = cuenta.totalItems.toNumber();
      const itemPDA = await getItemPDA(restaurantePDA, nextId);

      try {
        await program.methods
          .crearItem("A".repeat(51), "desc", new BN(1000), { otros: {} }, true)
          .accounts({
            itemMenu: itemPDA,
            restaurante: restaurantePDA,
            dueno: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Deberia haber fallado");
      } catch (e: any) {
        assert.include(e.message, "NombreMuyLargo");
      }
    });

    it("Falla si el precio es 0", async () => {
      const cuenta = await program.account.restauranteAccount.fetch(
        restaurantePDA
      );
      const nextId = cuenta.totalItems.toNumber();
      const itemPDA = await getItemPDA(restaurantePDA, nextId);

      try {
        await program.methods
          .crearItem("Test", "desc", new BN(0), { otros: {} }, true)
          .accounts({
            itemMenu: itemPDA,
            restaurante: restaurantePDA,
            dueno: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Deberia haber fallado");
      } catch (e: any) {
        assert.include(e.message, "PrecioInvalido");
      }
    });
  });

  describe("READ", () => {
    it("Obtiene un item por ID", async () => {
      const itemPDA = await getItemPDA(restaurantePDA, 0);
      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.id.toNumber(), 0);
      assert.equal(item.nombre, "Taco de Pastor");
    });

    it("Los PDAs son deterministicos", async () => {
      const pda1 = await getItemPDA(restaurantePDA, 0);
      const pda2 = await getItemPDA(restaurantePDA, 0);
      assert.equal(pda1.toBase58(), pda2.toBase58());
    });
  });

  describe("UPDATE", () => {
    it("Actualiza el precio", async () => {
      const itemPDA = await getItemPDA(restaurantePDA, 0);
      await program.methods
        .actualizarItem(null, null, new BN(3000), null, null)
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.precio.toNumber(), 3000);
    });

    it("Marca un item como no disponible", async () => {
      const itemPDA = await getItemPDA(restaurantePDA, 1);
      await program.methods
        .actualizarItem(null, null, null, null, false)
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.isFalse(item.disponible);
    });

    it("Actualiza nombre y descripcion", async () => {
      const itemPDA = await getItemPDA(restaurantePDA, 2);
      await program.methods
        .actualizarItem(
          "Elote en Vaso",
          "Elote desgranado con crema, chile y limon",
          null,
          null,
          null
        )
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
        })
        .rpc();

      const item = await program.account.itemMenuAccount.fetch(itemPDA);
      assert.equal(item.nombre, "Elote en Vaso");
    });
  });

  describe("DELETE", () => {
    it("Elimina un item y recupera el rent", async () => {
      const itemPDA = await getItemPDA(restaurantePDA, 2);

      await program.methods
        .eliminarItem()
        .accounts({
          itemMenu: itemPDA,
          restaurante: restaurantePDA,
          dueno: wallet.publicKey,
        })
        .rpc();

      try {
        await program.account.itemMenuAccount.fetch(itemPDA);
        assert.fail("La cuenta deberia haberse cerrado");
      } catch {
        // cuenta cerrada correctamente
      }
    });
  });
});
