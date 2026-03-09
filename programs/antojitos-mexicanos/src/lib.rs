// @ts-nocheck
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod antojitos_mexicanos {
    use super::*;

    pub fn inicializar_restaurante(
        ctx: Context<InicializarRestaurante>,
        nombre: String,
    ) -> Result<()> {
        require!(nombre.len() <= 50, ErrorCode::NombreMuyLargo);
        let dueno_key = ctx.accounts.dueno.key();
        let restaurante = &mut ctx.accounts.restaurante;
        restaurante.dueno = dueno_key;
        restaurante.nombre = nombre;
        restaurante.total_items = 0;
        restaurante.bump = ctx.bumps.restaurante;
        Ok(())
    }

    pub fn crear_item(
        ctx: Context<CrearItem>,
        nombre: String,
        descripcion: String,
        precio: u64,
        categoria: Categoria,
        disponible: bool,
    ) -> Result<()> {
        require!(nombre.len() <= 50, ErrorCode::NombreMuyLargo);
        require!(descripcion.len() <= 200, ErrorCode::DescripcionMuyLarga);
        require!(precio > 0, ErrorCode::PrecioInvalido);

        let restaurante_key = ctx.accounts.restaurante.key();
        let restaurante = &mut ctx.accounts.restaurante;
        let item = &mut ctx.accounts.item_menu;

        item.restaurante = restaurante_key;
        item.id = restaurante.total_items;
        item.nombre = nombre;
        item.descripcion = descripcion;
        item.precio = precio;
        item.categoria = categoria;
        item.disponible = disponible;
        item.bump = ctx.bumps.item_menu;
        item.creado_en = Clock::get()?.unix_timestamp;
        item.actualizado_en = Clock::get()?.unix_timestamp;

        restaurante.total_items = restaurante.total_items.checked_add(1).unwrap();
        Ok(())
    }

    pub fn actualizar_item(
        ctx: Context<ActualizarItem>,
        nombre: Option<String>,
        descripcion: Option<String>,
        precio: Option<u64>,
        categoria: Option<Categoria>,
        disponible: Option<bool>,
    ) -> Result<()> {
        let item = &mut ctx.accounts.item_menu;

        if let Some(n) = nombre {
            require!(n.len() <= 50, ErrorCode::NombreMuyLargo);
            item.nombre = n;
        }
        if let Some(d) = descripcion {
            require!(d.len() <= 200, ErrorCode::DescripcionMuyLarga);
            item.descripcion = d;
        }
        if let Some(p) = precio {
            require!(p > 0, ErrorCode::PrecioInvalido);
            item.precio = p;
        }
        if let Some(c) = categoria {
            item.categoria = c;
        }
        if let Some(disp) = disponible {
            item.disponible = disp;
        }

        item.actualizado_en = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn eliminar_item(_ctx: Context<EliminarItem>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nombre: String)]
pub struct InicializarRestaurante<'info> {
    #[account(
        init,
        payer = dueno,
        space = RestauranteAccount::LEN,
        seeds = [b"restaurante", dueno.key().as_ref()],
        bump
    )]
    pub restaurante: Account<'info, RestauranteAccount>,
    #[account(mut)]
    pub dueno: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CrearItem<'info> {
    #[account(
        init,
        payer = dueno,
        space = ItemMenuAccount::LEN,
        seeds = [b"item", restaurante.key().as_ref(), restaurante.total_items.to_le_bytes().as_ref()],
        bump
    )]
    pub item_menu: Account<'info, ItemMenuAccount>,
    #[account(
        mut,
        seeds = [b"restaurante", dueno.key().as_ref()],
        bump = restaurante.bump,
        has_one = dueno @ ErrorCode::NoAutorizado
    )]
    pub restaurante: Account<'info, RestauranteAccount>,
    #[account(mut)]
    pub dueno: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ActualizarItem<'info> {
    #[account(
        mut,
        seeds = [b"item", restaurante.key().as_ref(), item_menu.id.to_le_bytes().as_ref()],
        bump = item_menu.bump,
        has_one = restaurante @ ErrorCode::ItemNoPertenece
    )]
    pub item_menu: Account<'info, ItemMenuAccount>,
    #[account(
        seeds = [b"restaurante", dueno.key().as_ref()],
        bump = restaurante.bump,
        has_one = dueno @ ErrorCode::NoAutorizado
    )]
    pub restaurante: Account<'info, RestauranteAccount>,
    pub dueno: Signer<'info>,
}

#[derive(Accounts)]
pub struct EliminarItem<'info> {
    #[account(
        mut,
        seeds = [b"item", restaurante.key().as_ref(), item_menu.id.to_le_bytes().as_ref()],
        bump = item_menu.bump,
        has_one = restaurante @ ErrorCode::ItemNoPertenece,
        close = dueno
    )]
    pub item_menu: Account<'info, ItemMenuAccount>,
    #[account(
        seeds = [b"restaurante", dueno.key().as_ref()],
        bump = restaurante.bump,
        has_one = dueno @ ErrorCode::NoAutorizado
    )]
    pub restaurante: Account<'info, RestauranteAccount>,
    #[account(mut)]
    pub dueno: Signer<'info>,
}

#[account]
pub struct RestauranteAccount {
    pub dueno: Pubkey,
    pub nombre: String,
    pub total_items: u64,
    pub bump: u8,
}

impl RestauranteAccount {
    pub const LEN: usize = 8 + 32 + (4 + 50) + 8 + 1;
}

#[account]
pub struct ItemMenuAccount {
    pub restaurante: Pubkey,
    pub id: u64,
    pub nombre: String,
    pub descripcion: String,
    pub precio: u64,
    pub categoria: Categoria,
    pub disponible: bool,
    pub bump: u8,
    pub creado_en: i64,
    pub actualizado_en: i64,
}

impl ItemMenuAccount {
    pub const LEN: usize = 8 + 32 + 8 + (4 + 50) + (4 + 200) + 8 + 2 + 1 + 1 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum Categoria {
    Tacos,
    Quesadillas,
    Tortas,
    Elotes,
    Aguas,
    Postres,
    Otros,
}

#[error_code]
pub enum ErrorCode {
    #[msg("El nombre no puede tener mas de 50 caracteres")]
    NombreMuyLargo,
    #[msg("La descripcion no puede tener mas de 200 caracteres")]
    DescripcionMuyLarga,
    #[msg("El precio debe ser mayor a 0")]
    PrecioInvalido,
    #[msg("No tienes autorizacion para realizar esta accion")]
    NoAutorizado,
    #[msg("El item no pertenece a este restaurante")]
    ItemNoPertenece,
}
