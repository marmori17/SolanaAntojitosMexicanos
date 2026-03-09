#  Antojitos Mexicanos — Programa Solana (Anchor)

Programa on-chain desplegado en **Solana Devnet** que gestiona restaurantes y sus menús de forma descentralizada.

- **Program ID:** `HNMtss8Pd5Qb9iBfQLnbAShVoFaasrdqiCCQr48J95gM`
- **Red:** Solana Devnet
- **Framework:** Anchor v0.1.0

---

## Arquitectura del Programa

El programa maneja dos tipos de cuentas on-chain derivadas mediante PDAs (Program Derived Addresses):

```
Owner Wallet
    │
    ├── RestauranteAccount  [PDA: "restaurante" + owner]
    │       └── nombre, totalItems, bump
    │
    └── ItemMenuAccount (N items)  [PDA: "item" + restaurantePDA + id_u64_le]
            └── nombre, descripcion, precio, categoria, disponible, timestamps
```

### Cuentas (Accounts)

#### `RestauranteAccount`

Almacena la información del restaurante. Existe una cuenta por wallet dueño.

| Campo        | Tipo        | Descripción                          |
|--------------|-------------|--------------------------------------|
| `dueno`      | `PublicKey` | Wallet propietario del restaurante   |
| `nombre`     | `String`    | Nombre del restaurante (máx. 50 chars) |
| `totalItems` | `u64`       | Contador de ítems creados (se usa como ID incremental) |
| `bump`       | `u8`        | Bump seed del PDA                    |

**PDA:** `["restaurante", owner_pubkey]`

---

#### `ItemMenuAccount`

Almacena un ítem del menú. Cada ítem pertenece a un restaurante y tiene un ID único autoincremental.

| Campo          | Tipo        | Descripción                                  |
|----------------|-------------|----------------------------------------------|
| `restaurante`  | `PublicKey` | PDA del restaurante al que pertenece         |
| `id`           | `u64`       | ID único del ítem (incremental)              |
| `nombre`       | `String`    | Nombre del platillo (máx. 50 chars)          |
| `descripcion`  | `String`    | Descripción del platillo (máx. 200 chars)    |
| `precio`       | `u64`       | Precio en lamports                           |
| `categoria`    | `Categoria` | Categoría del ítem (enum)                   |
| `disponible`   | `bool`      | Si el ítem está disponible actualmente       |
| `bump`         | `u8`        | Bump seed del PDA                            |
| `creadoEn`     | `i64`       | Unix timestamp de creación                  |
| `actualizadoEn`| `i64`       | Unix timestamp de última actualización       |

**PDA:** `["item", restaurante_pda, id_as_u64_le_bytes]`  
**Tamaño fijo:** `333 bytes`

---

### Enum `Categoria`

Los ítems del menú se clasifican en una de las siguientes categorías:

| Variante       |
|----------------|
| `Tacos`        |
| `Quesadillas`  |
| `Tortas`       |
| `Elotes`       |
| `Aguas`        |
| `Postres`      |
| `Otros`        |

---

## Instrucciones

### `inicializarRestaurante`

Crea la cuenta del restaurante para el wallet firmante. Solo se puede llamar una vez por wallet.

**Cuentas requeridas:**

| Cuenta          | Mutable | Firmante | Descripción                      |
|-----------------|---------|----------|----------------------------------|
| `restaurante`   | ✅      | ❌       | PDA de la cuenta del restaurante |
| `dueno`         | ✅      | ✅       | Wallet del dueño                 |
| `systemProgram` | ❌      | ❌       | System Program                   |

**Argumentos:**

| Argumento | Tipo     | Descripción               |
|-----------|----------|---------------------------|
| `nombre`  | `String` | Nombre del restaurante    |

---

### `crearItem`

Agrega un nuevo ítem al menú del restaurante. El ID del ítem es `totalItems` actual antes del incremento.

**Cuentas requeridas:**

| Cuenta          | Mutable | Firmante | Descripción                   |
|-----------------|---------|----------|-------------------------------|
| `itemMenu`      | ✅      | ❌       | PDA del nuevo ítem            |
| `restaurante`   | ✅      | ❌       | PDA del restaurante (se actualiza `totalItems`) |
| `dueno`         | ✅      | ✅       | Wallet del dueño              |
| `systemProgram` | ❌      | ❌       | System Program                |

**Argumentos:**

| Argumento     | Tipo        | Descripción                     |
|---------------|-------------|---------------------------------|
| `nombre`      | `String`    | Nombre del platillo             |
| `descripcion` | `String`    | Descripción del platillo        |
| `precio`      | `u64`       | Precio en lamports              |
| `categoria`   | `Categoria` | Categoría del ítem              |
| `disponible`  | `bool`      | Disponibilidad inicial          |

---

### `actualizarItem`

Modifica los campos de un ítem existente. Todos los argumentos son opcionales (`Option<T>`); solo se actualizan los campos que no sean `null`.

**Cuentas requeridas:**

| Cuenta        | Mutable | Firmante | Descripción              |
|---------------|---------|----------|--------------------------|
| `itemMenu`    | ✅      | ❌       | PDA del ítem a editar    |
| `restaurante` | ❌      | ❌       | PDA del restaurante      |
| `dueno`       | ❌      | ✅       | Wallet del dueño         |

**Argumentos:**

| Argumento     | Tipo               | Descripción                            |
|---------------|--------------------|----------------------------------------|
| `nombre`      | `Option<String>`   | Nuevo nombre (o `null` para no cambiar) |
| `descripcion` | `Option<String>`   | Nueva descripción                      |
| `precio`      | `Option<u64>`      | Nuevo precio                           |
| `categoria`   | `Option<Categoria>`| Nueva categoría                        |
| `disponible`  | `Option<bool>`     | Nueva disponibilidad                   |

---

### `eliminarItem`

Cierra la cuenta del ítem y devuelve el rent al dueño.

**Cuentas requeridas:**

| Cuenta        | Mutable | Firmante | Descripción              |
|---------------|---------|----------|--------------------------|
| `itemMenu`    | ✅      | ❌       | PDA del ítem a eliminar  |
| `restaurante` | ❌      | ❌       | PDA del restaurante      |
| `dueno`       | ✅      | ✅       | Wallet del dueño (recibe el rent) |

---

## Errores

| Código | Nombre               | Mensaje                                          |
|--------|----------------------|--------------------------------------------------|
| 6000   | `NombreMuyLargo`     | El nombre no puede tener mas de 50 caracteres    |
| 6001   | `DescripcionMuyLarga`| La descripcion no puede tener mas de 200 caracteres |
| 6002   | `PrecioInvalido`     | El precio debe ser mayor a 0                     |
| 6003   | `NoAutorizado`       | No tienes autorizacion para realizar esta accion |
| 6004   | `ItemNoPertenece`    | El item no pertenece a este restaurante          |

---

## Derivación de PDAs (Client-Side)

```typescript
// PDA del restaurante
const [restaurantePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("restaurante"), ownerPublicKey.toBuffer()],
  new PublicKey(PROGRAM_ID)
);

// PDA de un ítem
const buf = Buffer.alloc(8);
buf.writeBigUInt64LE(BigInt(itemId));
const [itemPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("item"), restaurantePDA.toBuffer(), buf],
  new PublicKey(PROGRAM_ID)
);
```

---

## Consultas (Read-Only)

Para leer cuentas sin wallet, se usa un `Program` sin `AnchorProvider`:

```typescript
// Leer cuenta del restaurante
const prog = new Program(IDL, PROGRAM_ID);
const data = prog.coder.accounts.decode('restauranteAccount', accountInfo.data);

// Leer todos los ítems de un restaurante
const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
  filters: [
    { dataSize: 333 },
    { memcmp: { offset: 8, bytes: restaurantePDA.toBase58() } }
  ]
});
```

> El offset `8` corresponde al discriminador de Anchor (8 bytes) que precede a todos los campos de la cuenta. El primer campo de `ItemMenuAccount` es `restaurante (PublicKey)`, por lo que filtrar por `offset: 8` permite obtener todos los ítems de un restaurante específico.
