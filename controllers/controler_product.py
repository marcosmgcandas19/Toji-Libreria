# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
import json


class TojiProductAPI(http.Controller):
    """API Controller para productos publicados en web"""

    @http.route('/api/toji/products', auth='public', type='http')
    def get_products(self, **kwargs):
        """
        Retorna un arreglo JSON de libros publicados en web.
        
        Campos retornados:
        - id: ID del libro
        - name: Nombre del libro
        - price: Precio de lista
        - image_url: URL de la imagen del libro
        
        Returns:
            JSON Response
        """
        try:
            # Consultar libros con website_published = True
            products = request.env['product.template'].sudo().search([
                ('website_published', '=', True)
            ])
            
            # Construir arreglo con los datos requeridos
            products_data = []
            for product in products:
                # Obtener URL de imagen
                image_url = ''
                if product.image_url:
                    image_url = product.image_url
                elif product.image_1920:
                    # Usar imagen del template si existe
                    image_url = f"/web/image/product.template/{product.id}/image_1920"
                
                products_data.append({
                    'id': product.id,
                    'name': product.name,
                    'price': float(product.list_price) if product.list_price else 0.0,
                    'image_url': image_url,
                })
            
            response_data = {
                'success': True,
                'products': products_data,
                'count': len(products_data)
            }
            
            # Retornar JSON con headers CORS
            headers = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
            
            return request.make_response(
                json.dumps(response_data),
                headers=headers
            )
            
        except Exception as e:
            response_data = {
                'success': False,
                'error': str(e),
                'products': [],
                'count': 0
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
            
            return request.make_response(
                json.dumps(response_data),
                headers=headers
            )

    @http.route('/api/toji/products/<int:product_id>', auth='public', type='json')
    def get_product_detail(self, product_id, **kwargs):
        """
        Retorna los detalles de un producto individual publicado en web.
        
        URL: GET/POST /api/toji/products/<product_id>
        
        Args:
            product_id (int): ID del producto a obtener
        
        Returns:
            JSON con los siguientes campos:
            - id: ID del producto
            - name: Nombre del producto
            - price: Precio de lista
            - description: Descripción del producto
            - synopsis: Sinopsis literaria
            - authors: Lista de autores con id y name
            - image_url: URL de la imagen del producto
            - website_published: Estado de publicación en web
        """
        try:
            print(f"\n[DEBUG] Buscando producto con ID: {product_id}, tipo: {type(product_id)}")
            
            # Buscar el producto que coincida con el ID y esté publicado
            product = request.env['product.template'].sudo().search([
                ('id', '=', product_id),
                ('website_published', '=', True)
            ], limit=1)
            
            print(f"[DEBUG] Producto encontrado: {bool(product)}")
            
            # Si no encuentra con website_published, buscar sin esa condición para debuguear
            if not product:
                print(f"[DEBUG] No encontrado con website_published=True, buscando sin esa condición...")
                product_debug = request.env['product.template'].sudo().search([
                    ('id', '=', product_id)
                ], limit=1)
                if product_debug:
                    print(f"[DEBUG] Producto existe pero website_published={product_debug.website_published}")
                else:
                    print(f"[DEBUG] Producto NO existe en la BD")
            
            # Validar que el producto existe
            if not product:
                return {
                    'success': False,
                    'error': 'Producto no encontrado o no publicado',
                    'product': None
                }
            
            # Obtener URL de imagen
            image_url = ''
            if product.image_url:
                image_url = product.image_url
            elif product.image_1920:
                image_url = f"/web/image/product.template/{product.id}/image_1920"
            
            # Construir lista de autores
            authors_data = []
            for author in product.author_ids:
                authors_data.append({
                    'id': author.id,
                    'name': author.name,
                })
            
            # Construir respuesta con los detalles del producto
            product_data = {
                'id': product.id,
                'name': product.name,
                'price': float(product.list_price) if product.list_price else 0.0,
                'description': product.description or '',
                'synopsis': product.synopsis or '',
                'authors': authors_data,
                'image_url': image_url,
                'website_published': product.website_published,
            }
            
            print(f"[DEBUG] Retornando producto exitosamente: {product.name}")
            
            return {
                'success': True,
                'product': product_data
            }
            
        except Exception as e:
            print(f"[DEBUG] Error en get_product_detail: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': str(e),
                'product': None
            }

    # ==================== ENDPOINTS DEL CARRITO ====================

    @http.route('/api/toji/cart/add', auth='public', type='json', methods=['POST'])
    def add_to_cart(self, **kwargs):
        """
        Añade un producto al carrito o modifica su cantidad.
        
        Este endpoint utiliza los métodos nativos de website_sale para:
        - Gestionar automáticamente la sesión del usuario
        - Crear un sale.order si no existe
        - Añadir o actualizar sale.order.line
        
        Parámetros esperados (JSON POST):
        - product_id (int, requerido): ID del producto a añadir
        - add_qty (int, opcional): Cantidad a añadir (aumenta cantidad existente)
        - set_qty (int, opcional): Cantidad exacta (reemplaza cantidad existente)
        
        Returns:
            JSON con el estado actualizado del carrito
        """
        try:
            product_id = kwargs.get('product_id')
            add_qty = kwargs.get('add_qty', 0)
            set_qty = kwargs.get('set_qty')
            
            if not product_id:
                return {
                    'success': False,
                    'error': 'product_id es requerido'
                }
            
            # Obtener o crear el pedido de venta de la sesión actual
            order = request.website.sale_get_order(force_create=True)
            
            # Obtener el producto
            product = request.env['product.product'].sudo().browse(int(product_id))
            if not product.exists():
                return {
                    'success': False,
                    'error': f'Producto con ID {product_id} no existe'
                }
            
            # Buscar si la línea del producto ya existe en el carrito
            existing_line = order.order_line.filtered(
                lambda l: l.product_id.id == int(product_id)
            )
            
            if existing_line:
                if set_qty is not None:
                    # Establecer cantidad exacta
                    existing_line.write({'product_uom_qty': float(set_qty)})
                elif add_qty > 0:
                    # Añadir cantidad a la existente
                    existing_line.write({
                        'product_uom_qty': existing_line.product_uom_qty + float(add_qty)
                    })
            else:
                # Crear nueva línea si no existe
                qty = float(set_qty) if set_qty is not None else float(add_qty)
                if qty > 0:
                    order.write({
                        'order_line': [(0, 0, {
                            'product_id': int(product_id),
                            'product_uom_qty': qty,
                        })]
                    })
            
            # Retornar carrito actualizado
            return self._get_cart_data(order)
            
        except Exception as e:
            print(f"[DEBUG] Error en add_to_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/toji/cart', auth='public', type='json', methods=['GET'])
    def get_cart(self, **kwargs):
        """
        Obtiene el carrito actual del usuario.
        
        Utiliza request.website.sale_get_order() para recuperar el pedido
        asociado a la sesión actual del usuario.
        
        Returns:
            JSON con los datos del carrito o carrito vacío si no existe
        """
        try:
            order = request.website.sale_get_order()
            
            if not order:
                return {
                    'success': True,
                    'cart': {
                        'order_id': None,
                        'lines': [],
                        'total': 0.0,
                        'total_items': 0,
                        'currency': 'USD'
                    }
                }
            
            return self._get_cart_data(order)
            
        except Exception as e:
            print(f"[DEBUG] Error en get_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': str(e)
            }

    def _get_cart_data(self, order):
        """
        Helper method para construir la respuesta del carrito.
        
        Args:
            order: Registro de sale.order
            
        Returns:
            JSON formateado con datos del carrito
        """
        if not order or not order.order_line:
            return {
                'success': True,
                'cart': {
                    'order_id': None,
                    'lines': [],
                    'total': 0.0,
                    'total_items': 0,
                    'currency': 'USD'
                }
            }
        
        # Construir líneas del carrito
        lines_data = []
        for line in order.order_line:
            product = line.product_id
            
            # Obtener URL de imagen
            image_url = ''
            if product.image_url:
                image_url = product.image_url
            elif product.image_1920:
                image_url = f"/web/image/product.product/{product.id}/image_1920"
            
            lines_data.append({
                'id': line.id,
                'product_id': product.id,
                'product_name': product.name,
                'quantity': float(line.product_uom_qty),
                'price_unit': float(line.price_unit),
                'price_subtotal': float(line.price_subtotal),
                'image_url': image_url,
            })
        
        # Calcular totales
        total_items = sum(float(line.product_uom_qty) for line in order.order_line)
        total = float(order.amount_total)
        
        return {
            'success': True,
            'cart': {
                'order_id': order.id,
                'lines': lines_data,
                'total': total,
                'total_items': total_items,
                'currency': order.currency_id.name if order.currency_id else 'USD'
            }
        }

    @http.route('/api/toji/cart/remove', auth='public', type='json', methods=['POST'])
    def remove_from_cart(self, **kwargs):
        """
        Elimina una línea del carrito.
        
        Parámetros esperados (JSON POST):
        - line_id (int, requerido): ID de sale.order.line a eliminar
        
        Returns:
            JSON con el carrito actualizado
        """
        try:
            line_id = kwargs.get('line_id')
            
            if not line_id:
                return {
                    'success': False,
                    'error': 'line_id es requerido'
                }
            
            order = request.website.sale_get_order()
            
            if not order:
                return {
                    'success': False,
                    'error': 'No hay carrito activo'
                }
            
            line = request.env['sale.order.line'].sudo().browse(int(line_id))
            if line.exists() and line.order_id.id == order.id:
                line.unlink()
            else:
                return {
                    'success': False,
                    'error': f'Línea {line_id} no encontrada en el carrito'
                }
            
            return self._get_cart_data(order)
            
        except Exception as e:
            print(f"[DEBUG] Error en remove_from_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': str(e)
            }

    @http.route('/api/toji/cart/confirm', auth='public', type='json', methods=['POST'])
    def confirm_order(self, **kwargs):
        """
        Confirma el pedido de compra actual.
        
        Este endpoint:
        1. Recupera el pedido actual de la sesión
        2. Valida que tenga líneas
        3. Ejecuta action_confirm() para cambiar estado a "Pedido de Venta"
        4. Desvincula el pedido de la sesión para nuevas compras
        
        Returns:
            JSON con los datos del pedido confirmado
        """
        try:
            order = request.website.sale_get_order()
            
            if not order:
                return {
                    'success': False,
                    'error': 'No hay carrito para confirmar'
                }
            
            if not order.order_line:
                return {
                    'success': False,
                    'error': 'El carrito está vacío, no se puede confirmar'
                }
            
            print(f"[DEBUG] Confirmando pedido: {order.name}")
            
            # Confirmar el pedido
            order.action_confirm()
            
            print(f"[DEBUG] Pedido confirmado: {order.name}, estado: {order.state}")
            
            # Desvincularlo de la sesión
            request.session.pop('sale_order_id', None)
            
            return {
                'success': True,
                'order_id': order.id,
                'order_number': order.name,
                'total': float(order.amount_total),
                'message': f'Pedido {order.name} confirmado exitosamente'
            }
            
        except Exception as e:
            print(f"[DEBUG] Error en confirm_order: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': str(e)
            }

