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

    @http.route('/api/toji/cart/add', auth='public', type='http', csrf=False, methods=['POST'])
    def add_to_cart(self, **kwargs):
        """
        Añade un producto al carrito o modifica su cantidad.
        """
        try:
            import json as json_module
            
            # Parsear JSON del body
            request_data = {}
            try:
                body = request.httprequest.data
                if body:
                    request_data = json_module.loads(body)
            except:
                pass
            
            product_id = request_data.get('product_id')
            add_qty = request_data.get('add_qty', 1)
            set_qty = request_data.get('set_qty')
            
            print(f"[DEBUG] add_to_cart recibido: product_id={product_id}, add_qty={add_qty}")
            
            if not product_id:
                response_data = {'success': False, 'error': 'product_id es requerido'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Validar que el producto existe
            product = request.env['product.product'].sudo().browse(int(product_id))
            if not product.exists():
                response_data = {'success': False, 'error': f'Producto con ID {product_id} no existe'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Obtener el website actual
            try:
                website = request.env['website'].sudo().get_current_website()
            except:
                website = request.env['website'].sudo().search([], limit=1)
            
            if not website:
                response_data = {'success': False, 'error': 'No hay website configurado'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Obtener o crear el carrito
            order = website.sale_get_order(force_create=True)
            if not order:
                raise Exception("No se pudo crear o recuperar el pedido de venta")
            
            # Actualizar carrito
            if set_qty is not None:
                order._cart_update(product_id=int(product_id), set_qty=float(set_qty))
            else:
                order._cart_update(product_id=int(product_id), add_qty=float(add_qty))
            
            # Retornar carrito actualizado
            cart_response = self._get_cart_data(order)
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(cart_response), headers=headers)
            
        except Exception as e:
            print(f"[ERROR] Error en add_to_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            response_data = {'success': False, 'error': str(e)}
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(response_data), headers=headers)

    @http.route('/api/toji/cart', auth='public', type='http', methods=['GET'])
    def get_cart(self, **kwargs):
        """
        Obtiene el carrito actual del usuario.
        """
        try:
            # Obtener el website actual
            try:
                website = request.env['website'].sudo().get_current_website()
            except:
                website = request.env['website'].sudo().search([], limit=1)
            
            if not website:
                response_data = {
                    'success': True,
                    'cart': {
                        'order_id': None,
                        'lines': [],
                        'subtotal': 0.0,
                        'tax_total': 0.0,
                        'total': 0.0,
                        'total_items': 0,
                        'currency': 'USD'
                    }
                }
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Obtener sin crear para no generar órdenes vacías
            order = website.sale_get_order(force_create=False)
            
            if not order:
                response_data = {
                    'success': True,
                    'cart': {
                        'order_id': None,
                        'lines': [],
                        'subtotal': 0.0,
                        'tax_total': 0.0,
                        'total': 0.0,
                        'total_items': 0,
                        'currency': 'USD'
                    }
                }
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            cart_response = self._get_cart_data(order)
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(cart_response), headers=headers)
            
        except Exception as e:
            print(f"[DEBUG] Error en get_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            response_data = {
                'success': False,
                'error': str(e),
                'cart': None
            }
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(response_data), headers=headers)

    def _get_cart_data(self, order):
        """
        Helper method para construir la respuesta del carrito.
        
        Transforma el registro de sale.order en una estructura JSON consistente
        para consumo por el frontend React, incluyendo:
        - Detalles de las líneas del pedido (producto, cantidad, precios)
        - URLs de imágenes con fallback automático
        - Totales (subtotal, impuestos, total)
        - Información de moneda
        
        Args:
            order: Registro de sale.order (puede ser None o vacío)
            
        Returns:
            Dict con estructura estándar de carrito para JSON response
        """
        if not order or not order.order_line:
            return {
                'success': True,
                'cart': {
                    'order_id': None,
                    'lines': [],
                    'subtotal': 0.0,
                    'tax_total': 0.0,
                    'total': 0.0,
                    'total_items': 0,
                    'currency': 'USD'
                }
            }
        
        # Construir líneas del carrito
        lines_data = []
        for line in order.order_line:
            product = line.product_id
            
            # Obtener URL de imagen con fallback
            image_url = ''
            # Prioridad: product.image_url > product.image_1920 > template image
            if product.product_tmpl_id.image_url:
                image_url = product.product_tmpl_id.image_url
            elif product.image_1920:
                image_url = f"/web/image/product.product/{product.id}/image_1920"
            elif product.product_tmpl_id.image_1920:
                image_url = f"/web/image/product.template/{product.product_tmpl_id.id}/image_1920"
            
            lines_data.append({
                'id': line.id,
                'product_id': product.id,
                'product_name': product.name,
                'quantity': float(line.product_uom_qty),
                'price_unit': float(line.price_unit),
                'price_subtotal': float(line.price_subtotal),
                'tax_amount': float(line.tax_id.mapped('amount') and sum(line.tax_id.mapped('amount')) or 0),
                'image_url': image_url,
            })
        
        # Calcular totales
        total_items = sum(float(line.product_uom_qty) for line in order.order_line)
        subtotal = float(order.amount_untaxed)
        tax_total = float(order.amount_tax)
        total = float(order.amount_total)
        
        return {
            'success': True,
            'cart': {
                'order_id': order.id,
                'lines': lines_data,
                'subtotal': subtotal,
                'tax_total': tax_total,
                'total': total,
                'total_items': total_items,
                'currency': order.currency_id.name if order.currency_id else 'USD'
            }
        }

    @http.route('/api/toji/cart/remove', auth='public', type='http', csrf=False, methods=['POST'])
    def remove_from_cart(self, **kwargs):
        """
        Elimina una línea (item) del carrito.
        """
        try:
            import json as json_module
            
            # Parsear JSON del body
            request_data = {}
            try:
                body = request.httprequest.data
                if body:
                    request_data = json_module.loads(body)
            except:
                pass
            
            line_id = request_data.get('line_id')
            
            if not line_id:
                response_data = {'success': False, 'error': 'line_id es requerido'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Obtener el website actual
            try:
                website = request.env['website'].sudo().get_current_website()
            except:
                website = request.env['website'].sudo().search([], limit=1)
            
            if not website:
                response_data = {'success': False, 'error': 'No hay website'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            order = website.sale_get_order(force_create=False)
            
            if not order:
                response_data = {'success': False, 'error': 'No hay carrito activo'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            line = request.env['sale.order.line'].sudo().browse(int(line_id))
            if line.exists() and line.order_id.id == order.id:
                line.unlink()
            else:
                response_data = {'success': False, 'error': f'Línea {line_id} no encontrada'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            cart_response = self._get_cart_data(order)
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(cart_response), headers=headers)
            
        except Exception as e:
            print(f"[ERROR] Error en remove_from_cart: {str(e)}")
            import traceback
            traceback.print_exc()
            
            response_data = {'success': False, 'error': str(e)}
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(response_data), headers=headers)

    @http.route('/api/toji/cart/confirm', auth='public', type='http', csrf=False, methods=['POST'])
    def confirm_order(self, **kwargs):
        """
        Confirma y finaliza el pedido de compra actual.
        """
        try:
            # Obtener el website actual
            try:
                website = request.env['website'].sudo().get_current_website()
            except:
                website = request.env['website'].sudo().search([], limit=1)
            
            if not website:
                response_data = {'success': False, 'error': 'No hay website'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            # Obtener carrito actual sin crear uno nuevo
            order = website.sale_get_order(force_create=False)
            
            if not order:
                response_data = {'success': False, 'error': 'No hay carrito para confirmar'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            if not order.order_line:
                response_data = {'success': False, 'error': 'El carrito está vacío'}
                headers = {'Content-Type': 'application/json'}
                return request.make_response(json.dumps(response_data), headers=headers)
            
            print(f"[DEBUG] Confirmando pedido: {order.name}, estado: {order.state}")
            
            try:
                order.action_confirm()
            except Exception as e:
                print(f"[ERROR] Error al confirmar: {str(e)}")
                raise Exception(f"Error al confirmar: {str(e)}")
            
            print(f"[DEBUG] Pedido confirmado: {order.name}, nuevo estado: {order.state}")
            
            # Guardar datos antes de desvincularse
            order_id = order.id
            order_name = order.name
            order_total = float(order.amount_total)
            
            # Desvincularse de la sesión
            request.session.pop('sale_order_id', None)
            
            response_data = {
                'success': True,
                'order_id': order_id,
                'order_number': order_name,
                'total': order_total,
                'message': f'Pedido {order_name} confirmado exitosamente'
            }
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(response_data), headers=headers)
            
        except Exception as e:
            print(f"[ERROR] Error en confirm_order: {str(e)}")
            import traceback
            traceback.print_exc()
            
            response_data = {'success': False, 'error': str(e)}
            headers = {'Content-Type': 'application/json'}
            return request.make_response(json.dumps(response_data), headers=headers)

