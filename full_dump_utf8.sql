--
-- PostgreSQL database dump
--

\restrict THjwdQEFJXeE2hP0GE8VbDs3JYUb8EjOmaByFjUEPBOQhULsN7pXdEAmVHHaQDb

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    label character varying,
    street_address character varying NOT NULL,
    city character varying,
    postal_code character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    name character varying NOT NULL,
    image_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2) DEFAULT 0,
    max_discount_amount numeric(10,2),
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    center_lat numeric(10,8) NOT NULL,
    center_lng numeric(11,8) NOT NULL,
    radius_km numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    name character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.delivery_zones OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    rider_id uuid,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    title character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: order_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_histories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    status character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_histories OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    price_at_time numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    address_id uuid NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    delivery_distance_km numeric(5,2),
    notes text,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying NOT NULL,
    payment_status character varying DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    rider_id uuid,
    is_rated boolean DEFAULT false NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    phone_number character varying NOT NULL,
    otp_hash character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.otps OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric(10,2) NOT NULL,
    order_id character varying NOT NULL,
    stripe_payment_intent_id character varying,
    currency character varying DEFAULT 'USD'::character varying NOT NULL,
    status character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    discount_price numeric(10,2) DEFAULT '0'::numeric,
    stock_quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    name character varying NOT NULL,
    image_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: rider_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rider_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rider_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rider_reviews OWNER TO postgres;

--
-- Name: riders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.riders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    firebase_uid character varying,
    name character varying,
    email character varying,
    phone_number character varying NOT NULL,
    vehicle_type character varying,
    vehicle_number character varying,
    cnic_front_url character varying,
    cnic_back_url character varying,
    selfie_url character varying,
    is_profile_complete boolean DEFAULT false NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    current_lat numeric(10,8),
    current_lng numeric(11,8),
    total_earnings numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    average_rating numeric(3,2) DEFAULT '5'::numeric NOT NULL,
    total_reviews integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.riders OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key character varying(50) NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_phone_verified boolean DEFAULT false NOT NULL,
    firebase_uid character varying,
    name character varying,
    email character varying,
    phone_number character varying,
    role character varying DEFAULT 'customer'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    password character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (id, user_id, latitude, longitude, is_default, label, street_address, city, postal_code, created_at, updated_at, deleted_at) FROM stdin;
40e95dcd-6ba9-416a-914c-11c123277f64	68434188-3e79-4d26-bcd4-c1109d69ea84	25.08829347	67.12403040	f	Other	34RF+8MG	LalQila Maidan		2026-03-14 12:01:06.695399	2026-03-14 17:32:15.767342	\N
6f9ee4d7-26f5-4acf-b4b0-eb5d9a6587d1	68434188-3e79-4d26-bcd4-c1109d69ea84	26.35700068	67.45333325	f	Other	Johi	Johi		2026-03-14 12:04:09.391717	2026-03-14 17:32:15.767342	\N
61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	68434188-3e79-4d26-bcd4-c1109d69ea84	24.85001590	67.02892300	f	Work	Karim chambers CL-5	Karachi		2026-03-14 11:58:44.830016	2026-03-14 17:32:15.767342	\N
33ce4eed-335e-4e09-80af-7010014dc494	68434188-3e79-4d26-bcd4-c1109d69ea84	24.91522600	66.96431980	t	Home	18 24 Market Road, Gulshan e Habib, Sindh	Karachi		2026-03-14 11:49:59.70936	2026-03-14 17:32:15.782113	\N
fa57f8b7-3c27-4081-81e8-009a5475627d	99999999-9999-9999-9999-999999999999	24.91440000	66.97480000	t	Home	House 123, Sector 4, Baldia Town	\N	\N	2026-03-14 11:36:25.976411	2026-03-14 11:36:25.976411	\N
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, user_id, product_id, quantity, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, description, is_active, name, image_url, created_at, updated_at) FROM stdin;
dfef9360-e2b6-4ca2-ab13-c859fa18b7e8	Farm fresh local produce	t	Vegetables	https://384b-175-107-236-228.ngrok-free.app/public/cat_veg.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
dc81ff83-b968-44b9-a689-27ae1d12b602	Seasonal and exotic fruits	t	Fruits	https://384b-175-107-236-228.ngrok-free.app/public/cat_fruit.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
c449c570-4544-4e7b-a519-a0e92d7e7e15	Fresh halal meat	t	Meat & Poultry	https://384b-175-107-236-228.ngrok-free.app/public/cat_meat.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
6914c166-4424-46df-a6f4-b10279dbe19f	Milk, eggs, and bread	t	Dairy & Breakfast	https://384b-175-107-236-228.ngrok-free.app/public/cat_dairy.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
f95aec00-89cc-4d96-8c8e-ca0b6ecb87ab	Soft drinks and juices	t	Beverages	https://384b-175-107-236-228.ngrok-free.app/public/cat_bev.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
2f7ee868-ad74-4fd5-a352-5e19ea7dcdc5	Chips and biscuits	t	Snacks	https://384b-175-107-236-228.ngrok-free.app/public/cat_snack.png	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
e0c0a88b-dfd6-43d7-8f67-bcd6c361ce0a	Ready to cook	t	Frozen Foods	https://images.unsplash.com/photo-1584210228185-04d89c164104?q=80&w=600	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
aaf2cf5e-84f4-4eac-a8be-b29cc5182928	Hygiene and soaps	t	Personal Care	https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600	2026-03-14 11:36:25.996316	2026-03-14 11:36:25.996316
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupons (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, valid_from, valid_until, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: delivery_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_zones (id, center_lat, center_lng, radius_km, is_active, name, created_at, updated_at) FROM stdin;
6fab2006-0baa-4876-bdc7-00d4cb615b38	24.91440000	66.97480000	50.00	t	Baldia Town & Surroundings	2026-03-14 11:36:25.985886	2026-03-14 17:47:41.606452
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, rider_id, body, is_read, title, created_at) FROM stdin;
\.


--
-- Data for Name: order_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_histories (id, order_id, status, notes, created_at) FROM stdin;
922bb0d7-4957-412c-ac78-d89d56c9e791	6c073c69-dbc1-409f-9abe-b6d1814b142b	pending	Order placed	2026-03-14 11:50:40.621411
a75b1256-11be-4bee-baa3-4f7f7bcc7f67	6c073c69-dbc1-409f-9abe-b6d1814b142b	confirmed	Rider accepted the order	2026-03-14 11:53:42.290511
064f4baf-6fd4-4eae-b37c-4764d3e140d5	6c073c69-dbc1-409f-9abe-b6d1814b142b	preparing	\N	2026-03-14 11:54:31.765414
278c1326-3025-48f3-90a1-d5cbf320d414	6c073c69-dbc1-409f-9abe-b6d1814b142b	out_for_delivery	\N	2026-03-14 11:54:39.424181
838d6669-b0c1-4aff-8727-fae4d21ff622	6c073c69-dbc1-409f-9abe-b6d1814b142b	delivered	\N	2026-03-14 11:54:44.103107
d0716858-cd79-4d8e-ab10-3f8a152d51f8	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	pending	Order placed	2026-03-14 11:55:41.150872
776951d0-6ebc-4e2b-9f7b-9e32f841e84b	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	confirmed	Rider accepted the order	2026-03-14 11:56:18.7933
a7ec4eeb-be32-4a89-8720-caf1885f332b	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	preparing	\N	2026-03-14 11:56:23.067758
56e630a1-acc0-490e-b5d0-8b4ead192bb0	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	out_for_delivery	\N	2026-03-14 11:56:31.550891
eaa10501-ebcf-4a9e-98c3-526a35aee51a	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	delivered	\N	2026-03-14 11:57:02.226149
058a2d46-96dd-4653-89da-3c895beb75e3	ce89a644-db53-4c82-b854-f60be1761858	pending	Order placed	2026-03-14 11:59:01.752248
42f4ef11-6845-49de-b2e2-efadb0cdeed9	ce89a644-db53-4c82-b854-f60be1761858	confirmed	Rider accepted the order	2026-03-14 11:59:37.08013
1ac674c8-030f-4559-a390-b203cc111e8a	ce89a644-db53-4c82-b854-f60be1761858	preparing	\N	2026-03-14 11:59:53.066747
7a6415a0-5171-4fa2-ad8d-ebadc4b1c443	ce89a644-db53-4c82-b854-f60be1761858	out_for_delivery	\N	2026-03-14 11:59:54.315384
485b1d36-8d77-4409-8389-5ae7a287dd30	ce89a644-db53-4c82-b854-f60be1761858	delivered	\N	2026-03-14 11:59:54.844126
113fd6af-22da-48ad-9506-c0aca3a82939	dc16a420-2392-46a4-84a7-6b73252eb0c6	pending	Order placed	2026-03-14 12:01:31.431196
36c53dbd-d69c-4456-80dd-8c7d30420dd7	704b599e-544a-43ef-b23c-77793c7538ae	pending	Order placed	2026-03-14 12:02:37.079303
f2214865-b3b8-4a97-aee3-f1918707feb8	704b599e-544a-43ef-b23c-77793c7538ae	out_for_delivery	\N	2026-03-14 12:22:08.316505
d9883d79-d344-4f75-81b4-8c3d36c71e02	704b599e-544a-43ef-b23c-77793c7538ae	confirmed	\N	2026-03-14 12:22:11.505963
8ac9ad68-a9aa-4b82-97e5-f4566a0988ed	704b599e-544a-43ef-b23c-77793c7538ae	out_for_delivery	\N	2026-03-14 12:22:14.093384
fe6abbff-c4fd-4e2e-a28a-7b6eed152894	704b599e-544a-43ef-b23c-77793c7538ae	delivered	\N	2026-03-14 12:22:14.837323
c798eaa1-96fc-4b53-a2c9-0c845465805e	704b599e-544a-43ef-b23c-77793c7538ae	cancelled	\N	2026-03-14 12:22:15.50368
2610fb8a-cec9-4250-9c8c-4296b4fce917	704b599e-544a-43ef-b23c-77793c7538ae	confirmed	\N	2026-03-14 12:22:17.955231
d1ad3f68-7451-4463-8800-86bf4baa1e8c	ce89a644-db53-4c82-b854-f60be1761858	confirmed	\N	2026-03-14 12:22:38.590845
c2add871-d975-442b-9989-f04d8f2fe00a	ce89a644-db53-4c82-b854-f60be1761858	out_for_delivery	\N	2026-03-14 12:22:39.730553
8d75c938-f094-4057-adbb-cf380f0411e6	ce89a644-db53-4c82-b854-f60be1761858	delivered	\N	2026-03-14 12:22:40.893829
c1e766a1-70ad-41b3-981e-a53948172c04	ce89a644-db53-4c82-b854-f60be1761858	cancelled	\N	2026-03-14 12:22:42.336908
f3dd820b-dabc-43ac-87b3-cb2e1c76d81a	ce89a644-db53-4c82-b854-f60be1761858	confirmed	\N	2026-03-14 12:22:44.185038
a1da64bc-fa31-4e30-bd86-2e4941ead5d9	ce89a644-db53-4c82-b854-f60be1761858	delivered	\N	2026-03-14 12:22:46.718013
8ae0c66c-e699-47fa-b57d-7f0aefff96f3	dd939087-69f4-4e04-bfb2-6732f3cfddd3	pending	Order placed	2026-03-14 12:27:08.826371
3cbce5fa-17d5-4a33-a040-558c8fd90001	dd939087-69f4-4e04-bfb2-6732f3cfddd3	confirmed	Rider accepted the order	2026-03-14 12:27:42.209861
7b4e11ec-6c94-4223-a808-f572a7d0365b	dc16a420-2392-46a4-84a7-6b73252eb0c6	confirmed	Rider accepted the order	2026-03-14 12:27:50.711074
147c5e8c-3dc9-4a34-a337-7b96a0a34cda	dc16a420-2392-46a4-84a7-6b73252eb0c6	preparing	\N	2026-03-14 12:29:21.113225
f858d91e-50cd-4494-bd6c-8fd278d028ca	dc16a420-2392-46a4-84a7-6b73252eb0c6	out_for_delivery	\N	2026-03-14 12:29:51.67887
3cf143f3-a785-464c-b291-a76784530733	dc16a420-2392-46a4-84a7-6b73252eb0c6	delivered	\N	2026-03-14 12:30:02.111855
44120928-c71d-4435-8051-7ac5e709bb0c	dd939087-69f4-4e04-bfb2-6732f3cfddd3	preparing	\N	2026-03-14 12:59:29.319302
cf15cb2f-e86a-46a6-b1b7-5716edaab130	dd939087-69f4-4e04-bfb2-6732f3cfddd3	out_for_delivery	\N	2026-03-14 12:59:31.645018
33b66a77-b503-4417-a029-d43608a36c0c	dd939087-69f4-4e04-bfb2-6732f3cfddd3	delivered	\N	2026-03-14 12:59:42.722745
6bbd6ee4-40f0-4f84-8e86-899c85864e99	37eaa333-cc5e-48fd-9b6f-bf1d6e7d8cd2	pending	Order placed	2026-03-14 13:35:11.196986
87f301d4-3140-48f3-9051-b212f49276b8	74a5f16d-8c23-4b06-90fa-76462e163650	pending	Order placed	2026-03-14 13:36:23.121952
24b141ac-63c0-4d78-aeea-89fc7e420e6b	1d826c6e-a9e3-430d-b3c3-b4ed2caa6c0f	pending	Order placed	2026-03-14 13:36:45.817599
acedbbbd-d97c-48b9-a057-1bc9063eb9bb	bdb2b031-102e-44c5-a058-2cc0b0821361	pending	Order placed	2026-03-14 13:37:49.601006
d5db5f87-4e49-4a39-aedd-8372d31ac15f	e1e4bec1-8d57-4802-8514-83b9512f6f39	pending	Order placed	2026-03-14 13:52:49.911202
1752b268-b75f-48c9-8df7-8ff6540d6453	02778b9e-c418-4452-b366-7e7cb1c00e66	pending	Order placed	2026-03-14 13:53:30.471403
99ec4d50-1855-4b50-9441-884112c92706	754f57b0-0cd0-4509-8a6a-8a58596302b2	pending	Order placed	2026-03-14 13:55:32.509138
ce17a950-c09f-4e50-8076-86e3da7322a4	63e931cc-b2a5-4191-b3e1-de92acaa01cd	pending	Order placed	2026-03-14 13:55:50.17504
4583d410-033e-45e3-b2d0-1b582a086dcc	f279a3b4-3ee2-489b-b167-79aca3b54629	pending	Order placed	2026-03-14 13:56:58.646692
c4d95773-539a-40d8-8a10-1dda6891336f	165572a6-c682-4f57-a909-e5f59debe91b	pending	Order placed	2026-03-14 14:15:09.672222
5598c6d7-ffe6-48db-b517-64bae5d74f07	6592e7c3-252c-462b-8dab-bc54b612b7b0	pending	Order placed	2026-03-14 14:16:17.05194
6fddeb24-d82c-40d7-890c-6f0f2d83b529	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	pending	Order placed	2026-03-14 14:29:20.167426
5b121606-deec-4f45-9a74-83ab7a4d85d9	11a46417-999c-42e9-b69b-644dc9ca6a15	pending	Order placed	2026-03-14 14:40:27.703177
dcc56ba1-e994-4c40-9f39-ae41f38d4a13	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	pending	Order placed	2026-03-14 14:47:15.97381
400a4f8f-ae1a-4819-8354-25fc22dfe05b	94873738-0f9e-485a-9426-d40b59b7eeb0	pending	Order placed	2026-03-14 15:04:00.606628
8fa5a04e-64ae-4c2f-adc9-2d1c0a0c3f0e	013a7dfb-d82c-41da-bf81-0b70798fb7b2	pending	Order placed	2026-03-14 15:06:31.198695
9b743811-0093-464e-abe8-50b2c3bafb8e	013a7dfb-d82c-41da-bf81-0b70798fb7b2	confirmed	Rider accepted the order	2026-03-14 15:07:36.42377
cbcaf590-3ab4-46c7-827f-305d088ed44c	013a7dfb-d82c-41da-bf81-0b70798fb7b2	preparing	\N	2026-03-14 15:07:50.437531
c78b5b85-ff39-4262-81e5-4a310db974e3	013a7dfb-d82c-41da-bf81-0b70798fb7b2	out_for_delivery	\N	2026-03-14 15:07:51.527368
16096dd6-703d-422d-bb7d-5dad710dfd7c	013a7dfb-d82c-41da-bf81-0b70798fb7b2	delivered	\N	2026-03-14 15:07:54.351889
6d2fe0ea-c21c-4a9f-8aba-945cfa9d9990	94873738-0f9e-485a-9426-d40b59b7eeb0	confirmed	Rider accepted the order	2026-03-14 15:28:25.994782
9028c68b-8a22-45c4-9750-4f7a772dcbaf	94873738-0f9e-485a-9426-d40b59b7eeb0	preparing	\N	2026-03-14 15:28:28.308883
293ea309-2a63-406a-a739-e3f768b3de12	94873738-0f9e-485a-9426-d40b59b7eeb0	out_for_delivery	\N	2026-03-14 15:28:32.180948
07c0fbad-b2c4-47c1-b8bb-d0486d685341	94873738-0f9e-485a-9426-d40b59b7eeb0	delivered	\N	2026-03-14 15:28:41.284905
c840679e-0bfa-4ff9-b99a-33c4e6b0ff45	7ed9fccd-dba8-495b-8573-efd185a63969	pending	Order placed	2026-03-14 15:29:39.348482
cce5b3f7-e62a-49e5-9b4c-1f3ba252c55e	7ed9fccd-dba8-495b-8573-efd185a63969	confirmed	Rider accepted the order	2026-03-14 15:30:44.442762
d91088be-fc16-4641-b222-a13a7f6ab4d2	7ed9fccd-dba8-495b-8573-efd185a63969	cancelled	Cancelled by customer	2026-03-14 15:31:16.534254
bf183559-4abf-421d-a902-fe571a9c0e82	7ed9fccd-dba8-495b-8573-efd185a63969	preparing	\N	2026-03-14 15:31:27.597881
ab39dbf9-7588-4a2d-8da4-b11f88359d81	7ed9fccd-dba8-495b-8573-efd185a63969	cancelled	Cancelled by customer	2026-03-14 15:31:43.762906
76da72b0-3bad-4b08-ab3a-305f3476d0a2	7ed9fccd-dba8-495b-8573-efd185a63969	out_for_delivery	\N	2026-03-14 15:31:50.516669
e908564e-acd0-45a3-8f24-474d301b1d2d	7ed9fccd-dba8-495b-8573-efd185a63969	delivered	\N	2026-03-14 15:32:57.204204
87584e44-29e8-4077-9840-3a50752d1a64	be7c226f-0b47-4024-a0d4-9dbb42d38516	pending	Order placed	2026-03-14 15:48:34.021377
12a90c68-9d79-4e7a-b24f-92226abc6672	be7c226f-0b47-4024-a0d4-9dbb42d38516	confirmed	Rider accepted the order	2026-03-14 15:49:05.102974
670bf176-23a8-4ec2-8451-3f6560c271e0	be7c226f-0b47-4024-a0d4-9dbb42d38516	cancelled	Cancelled by customer	2026-03-14 15:49:20.389948
39713f96-8e61-4b0f-a645-b77a1f8bfab9	be7c226f-0b47-4024-a0d4-9dbb42d38516	preparing	\N	2026-03-14 15:49:51.539864
26d7a14a-985a-4793-8074-1c6eb99cbd26	be7c226f-0b47-4024-a0d4-9dbb42d38516	cancelled	Cancelled by customer	2026-03-14 15:49:56.663162
f32fa0fa-34b6-4088-b68d-8ca3d910607a	be7c226f-0b47-4024-a0d4-9dbb42d38516	out_for_delivery	\N	2026-03-14 15:52:44.725249
0b51cd79-5048-4d33-b721-2f3fd086788e	be7c226f-0b47-4024-a0d4-9dbb42d38516	delivered	\N	2026-03-14 15:52:46.238505
dd4d4893-9576-4af4-ace8-22ecd0c22c39	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	pending	Order placed	2026-03-14 15:56:59.929624
0a6dadf7-4f96-48cf-a643-995da88b0adf	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	confirmed	Rider accepted the order	2026-03-14 15:59:45.398509
5c3cdd1e-3486-497b-bde1-8c522be4057b	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	preparing	\N	2026-03-14 15:59:51.364638
0c09709e-3743-4238-940e-05def747a77e	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	out_for_delivery	\N	2026-03-14 15:59:52.218864
33472056-d75c-4215-929e-14e72c4b7ffe	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	delivered	\N	2026-03-14 15:59:53.124774
6693509b-3fe4-40ff-a620-4b58b7461f25	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	confirmed	Rider accepted the order	2026-03-14 16:00:01.520094
bc06d9e6-d3e9-4bb4-a311-588a2b9239b2	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	preparing	\N	2026-03-14 16:00:02.694188
e969e0a4-0b3e-4496-a0d8-928d105a7f83	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	out_for_delivery	\N	2026-03-14 16:00:03.907595
fdffdc71-d3b0-405b-b16f-583248e13ee8	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	delivered	\N	2026-03-14 16:00:05.2231
f5faa75e-1f6c-45a4-9418-efd0adc4c816	11a46417-999c-42e9-b69b-644dc9ca6a15	confirmed	Rider accepted the order	2026-03-14 16:47:55.675296
c1d2809a-196f-4543-9fbb-c72934b1c9e4	11a46417-999c-42e9-b69b-644dc9ca6a15	cancelled	Cancelled by customer	2026-03-14 16:48:19.804648
e1002779-2411-4f77-9c18-260c478818e4	11a46417-999c-42e9-b69b-644dc9ca6a15	cancelled	Cancelled by customer	2026-03-14 16:48:51.253122
0e995177-ba94-40de-b6c6-597a13f265a7	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	confirmed	Rider accepted the order	2026-03-14 16:51:29.209564
4896486b-b2f7-4ea8-a35e-295f5e3b796b	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	cancelled	Cancelled by customer	2026-03-14 16:51:39.317579
278674ce-1aab-4e02-a8bf-0f3426f497eb	11a46417-999c-42e9-b69b-644dc9ca6a15	confirmed	Rider accepted the order	2026-03-14 16:53:15.240891
086927a6-a24b-4842-a41b-3fb71101ec51	11a46417-999c-42e9-b69b-644dc9ca6a15	cancelled	Cancelled by customer	2026-03-14 16:53:20.98202
add2167c-c036-483a-b348-63277fd3b5ab	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	confirmed	Rider accepted the order	2026-03-14 16:54:30.482662
abc98cbf-65bb-4c29-8d78-daceda421e5f	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	cancelled	Cancelled by customer	2026-03-14 16:54:37.677059
1f622185-f2c5-4944-83d0-7fbce86ba1ef	6592e7c3-252c-462b-8dab-bc54b612b7b0	confirmed	Rider accepted the order	2026-03-14 16:57:01.007484
d4e8563a-5cd2-4c88-9bf5-cd605615dd2f	6592e7c3-252c-462b-8dab-bc54b612b7b0	cancelled	Cancelled by customer	2026-03-14 16:57:19.532443
38eaa723-394c-4310-9f1e-7ca0cea762fb	165572a6-c682-4f57-a909-e5f59debe91b	confirmed	Rider accepted the order	2026-03-14 16:59:15.007906
b2492006-aa06-4b35-914a-d0a0ae8e070b	165572a6-c682-4f57-a909-e5f59debe91b	cancelled	Cancelled by customer	2026-03-14 16:59:42.315845
24765550-0268-4be6-85e2-d7ce336c7243	11a46417-999c-42e9-b69b-644dc9ca6a15	confirmed	Rider accepted the order	2026-03-14 17:00:54.616691
079528de-5604-4aa3-b5c2-c6f6627b3a65	11a46417-999c-42e9-b69b-644dc9ca6a15	cancelled	Cancelled by customer	2026-03-14 17:01:01.801069
e4010832-a2e7-496c-853d-567037a34756	d9273fb6-b563-4c52-b580-6603fd1cec13	pending	Order placed	2026-03-14 17:32:43.272647
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price_at_time, created_at) FROM stdin;
9cf20760-8a25-4016-a2a8-8768aa7b4900	013a7dfb-d82c-41da-bf81-0b70798fb7b2	285be12b-2f92-48c5-92da-9258218017b8	2	175.00	2026-03-14 15:06:31.185969
48b53b9b-becd-48ed-92f7-54c27b5966f6	013a7dfb-d82c-41da-bf81-0b70798fb7b2	7ddd7406-640c-435f-bb9f-57f27cd26003	2	100.00	2026-03-14 15:06:31.185969
55ef53a2-76ee-49fe-8565-d76dc6217091	6c073c69-dbc1-409f-9abe-b6d1814b142b	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 11:50:40.610991
d3b42503-f11b-47be-803c-fe7ed73d1bfd	6c073c69-dbc1-409f-9abe-b6d1814b142b	93556bce-e62a-4dca-aacd-8c71f9da5709	1	1100.00	2026-03-14 11:50:40.610991
f70119e7-92fe-41c6-bc08-53a7d0270170	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 11:55:41.143454
40dea0b3-8da1-4e33-9f23-3589ef8672cd	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	f7bf977d-28c8-4604-b602-e287b149bb87	1	170.00	2026-03-14 11:55:41.143454
eda58d52-fc5d-4c34-a893-b5de1769b716	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 11:55:41.143454
32b74985-7e9a-4983-9474-bda311447df3	ce89a644-db53-4c82-b854-f60be1761858	f7bf977d-28c8-4604-b602-e287b149bb87	1	170.00	2026-03-14 11:59:01.741757
3bd7b990-b050-4f4e-849a-7814a605438e	ce89a644-db53-4c82-b854-f60be1761858	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 11:59:01.741757
24b67765-5a79-43c5-a47e-db598a374180	ce89a644-db53-4c82-b854-f60be1761858	ccfc1c90-7a61-49dd-8823-33089a0c8733	1	300.00	2026-03-14 11:59:01.741757
4b07e15e-ac48-43f8-b6a6-f57fcf25dcaa	dc16a420-2392-46a4-84a7-6b73252eb0c6	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 12:01:31.42421
4c8cc9e4-958b-4821-b8b1-d44c8dadfe05	dc16a420-2392-46a4-84a7-6b73252eb0c6	f7bf977d-28c8-4604-b602-e287b149bb87	1	170.00	2026-03-14 12:01:31.42421
dd36d4bd-1349-4ef9-b588-17bfb7dc5e54	dc16a420-2392-46a4-84a7-6b73252eb0c6	ccfc1c90-7a61-49dd-8823-33089a0c8733	1	300.00	2026-03-14 12:01:31.42421
4984666c-d628-4c9d-94e6-89caf7d39bde	704b599e-544a-43ef-b23c-77793c7538ae	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 12:02:37.071953
7f5cd6a2-7884-44cf-a769-2e2c5d3ab953	704b599e-544a-43ef-b23c-77793c7538ae	f7bf977d-28c8-4604-b602-e287b149bb87	1	170.00	2026-03-14 12:02:37.071953
2d70061f-e32f-49fe-be46-0daf1cbb2a82	704b599e-544a-43ef-b23c-77793c7538ae	ccfc1c90-7a61-49dd-8823-33089a0c8733	1	300.00	2026-03-14 12:02:37.071953
824788d9-d09a-4240-9307-952ea14524fb	dd939087-69f4-4e04-bfb2-6732f3cfddd3	77645f7b-807f-4c1b-95fd-3f0ccee2e491	5	140.00	2026-03-14 12:27:08.816731
1012f139-4e85-43e1-a0c8-a611084a7b61	dd939087-69f4-4e04-bfb2-6732f3cfddd3	658b892d-193b-49e4-9aaa-e595d880a46e	3	180.00	2026-03-14 12:27:08.816731
1ab3c3a1-d486-427a-b2a1-5ef974931354	dd939087-69f4-4e04-bfb2-6732f3cfddd3	132103a9-b12f-4bf5-81b9-65e17c623a73	3	120.00	2026-03-14 12:27:08.816731
19394857-829f-4e20-99fe-051881d3d69b	37eaa333-cc5e-48fd-9b6f-bf1d6e7d8cd2	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:35:11.183421
7de0cd82-e837-4905-af97-785235c7d2ae	37eaa333-cc5e-48fd-9b6f-bf1d6e7d8cd2	77645f7b-807f-4c1b-95fd-3f0ccee2e491	1	140.00	2026-03-14 13:35:11.183421
766d8939-7871-4cdf-8630-12fb05dab8ba	74a5f16d-8c23-4b06-90fa-76462e163650	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:36:23.109203
49260f25-89e8-4732-84ec-fb0e2b107be1	1d826c6e-a9e3-430d-b3c3-b4ed2caa6c0f	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:36:45.807217
fc02c1da-0aa2-4068-a1ef-5e0024554475	bdb2b031-102e-44c5-a058-2cc0b0821361	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:37:49.592743
52c14f2f-226a-4e41-a795-c726ae234ec8	e1e4bec1-8d57-4802-8514-83b9512f6f39	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:52:49.899746
1553c9e9-4207-4389-9610-ca5dee76fedf	e1e4bec1-8d57-4802-8514-83b9512f6f39	77645f7b-807f-4c1b-95fd-3f0ccee2e491	1	140.00	2026-03-14 13:52:49.899746
b6cb95c7-9300-4f98-9f09-c82f6d8bce4c	e1e4bec1-8d57-4802-8514-83b9512f6f39	658b892d-193b-49e4-9aaa-e595d880a46e	1	180.00	2026-03-14 13:52:49.899746
878f768e-b857-41bb-8481-318691695913	02778b9e-c418-4452-b366-7e7cb1c00e66	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 13:53:30.462797
e18512ae-d4ae-4f63-bd14-196c42211c7e	754f57b0-0cd0-4509-8a6a-8a58596302b2	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 13:55:32.501335
ef80b415-d262-40f5-ae0b-e4865c7b4a1c	63e931cc-b2a5-4191-b3e1-de92acaa01cd	ccfc1c90-7a61-49dd-8823-33089a0c8733	5	300.00	2026-03-14 13:55:50.167311
00eca0a4-807c-4084-a589-62936d608eba	f279a3b4-3ee2-489b-b167-79aca3b54629	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 13:56:58.638527
020ce3bd-324e-4d7c-bf8c-a46e7a2d456a	165572a6-c682-4f57-a909-e5f59debe91b	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 14:15:09.662253
a4b77e43-c420-4d7d-adbb-1649e9ec977c	165572a6-c682-4f57-a909-e5f59debe91b	77645f7b-807f-4c1b-95fd-3f0ccee2e491	1	140.00	2026-03-14 14:15:09.662253
0db3491d-d661-4f7e-b6b8-0e41467c35e8	165572a6-c682-4f57-a909-e5f59debe91b	794e24ac-5dca-41ee-8e4f-a81f131a9981	1	120.00	2026-03-14 14:15:09.662253
d5f33928-56e7-48e0-ad13-70191d6dde49	165572a6-c682-4f57-a909-e5f59debe91b	9b44459b-47fc-4499-acea-75497d458968	1	90.00	2026-03-14 14:15:09.662253
7c0aa734-147d-4581-ac8d-8778206bb124	6592e7c3-252c-462b-8dab-bc54b612b7b0	9b44459b-47fc-4499-acea-75497d458968	1	90.00	2026-03-14 14:16:17.043739
052e9c79-3f5b-4100-b73b-5a473fafb659	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 14:29:20.157701
d3d5c7ae-9fd5-4e95-9fdb-cc1924eb8058	47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	77645f7b-807f-4c1b-95fd-3f0ccee2e491	1	140.00	2026-03-14 14:29:20.157701
604b557e-24e0-43e2-8061-52ca1fbb0d27	11a46417-999c-42e9-b69b-644dc9ca6a15	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 14:40:27.693908
b3608adc-60a4-4e64-8c20-6311cc275108	b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 14:47:15.96306
18ee4174-8b7f-47a8-9060-bde483692e48	94873738-0f9e-485a-9426-d40b59b7eeb0	93556bce-e62a-4dca-aacd-8c71f9da5709	1	1100.00	2026-03-14 15:04:00.596238
43833fd7-1bea-4b63-b562-cd6d1896a877	94873738-0f9e-485a-9426-d40b59b7eeb0	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 15:04:00.596238
a2fddfa0-a200-42de-8dcd-e8f3427796ea	94873738-0f9e-485a-9426-d40b59b7eeb0	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 15:04:00.596238
6c546477-71ea-4122-a1d5-2b53a49bea90	013a7dfb-d82c-41da-bf81-0b70798fb7b2	658b892d-193b-49e4-9aaa-e595d880a46e	1	180.00	2026-03-14 15:06:31.185969
dc7d1f87-36c4-43b6-aab6-468c78256bef	013a7dfb-d82c-41da-bf81-0b70798fb7b2	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 15:06:31.185969
1b8c8475-7ced-46ef-8d03-f23209c12b9e	013a7dfb-d82c-41da-bf81-0b70798fb7b2	cc2b20c4-de88-4e71-8362-7e532c35f96d	1	340.00	2026-03-14 15:06:31.185969
8bf2008c-3703-4d80-adc1-76e4ae168e23	013a7dfb-d82c-41da-bf81-0b70798fb7b2	77645f7b-807f-4c1b-95fd-3f0ccee2e491	2	140.00	2026-03-14 15:06:31.185969
58e9758c-1703-4c13-8912-6c9cad671269	013a7dfb-d82c-41da-bf81-0b70798fb7b2	9b44459b-47fc-4499-acea-75497d458968	3	90.00	2026-03-14 15:06:31.185969
72595fcb-c650-455e-8633-00b64fa97809	7ed9fccd-dba8-495b-8573-efd185a63969	9b44459b-47fc-4499-acea-75497d458968	1	90.00	2026-03-14 15:29:39.334514
6d39aa5f-a3e9-4076-8feb-5aa3ef1ec0d3	7ed9fccd-dba8-495b-8573-efd185a63969	a2375971-165f-49ca-b108-c9245de19608	1	175.00	2026-03-14 15:29:39.334514
e8959326-53b0-44ae-b079-25f81a8567a5	7ed9fccd-dba8-495b-8573-efd185a63969	794e24ac-5dca-41ee-8e4f-a81f131a9981	1	120.00	2026-03-14 15:29:39.334514
bb09a2c8-dba2-4293-a3d3-d147d2b5a735	7ed9fccd-dba8-495b-8573-efd185a63969	93556bce-e62a-4dca-aacd-8c71f9da5709	1	1100.00	2026-03-14 15:29:39.334514
d7d79fe6-340e-4969-aa85-3db494bb19ee	7ed9fccd-dba8-495b-8573-efd185a63969	ccfc1c90-7a61-49dd-8823-33089a0c8733	1	300.00	2026-03-14 15:29:39.334514
8e90c58b-b224-464f-89ce-c82a268029a7	7ed9fccd-dba8-495b-8573-efd185a63969	f7bf977d-28c8-4604-b602-e287b149bb87	1	170.00	2026-03-14 15:29:39.334514
44f80276-e93e-4aa8-a8ec-b1f7f6369d18	7ed9fccd-dba8-495b-8573-efd185a63969	3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	1	320.00	2026-03-14 15:29:39.334514
9db573ef-2500-447e-8e53-9d4b74a157eb	7ed9fccd-dba8-495b-8573-efd185a63969	132103a9-b12f-4bf5-81b9-65e17c623a73	1	120.00	2026-03-14 15:29:39.334514
c674d2d3-355c-4ee7-ad0d-33ea93f402d3	7ed9fccd-dba8-495b-8573-efd185a63969	658b892d-193b-49e4-9aaa-e595d880a46e	1	180.00	2026-03-14 15:29:39.334514
5d652402-d40f-40ec-b16c-4140449521dc	7ed9fccd-dba8-495b-8573-efd185a63969	77645f7b-807f-4c1b-95fd-3f0ccee2e491	1	140.00	2026-03-14 15:29:39.334514
5b7007b7-bd33-490f-93f1-2535d77c8080	7ed9fccd-dba8-495b-8573-efd185a63969	7ddd7406-640c-435f-bb9f-57f27cd26003	1	100.00	2026-03-14 15:29:39.334514
577d64ea-978c-4105-8574-af7e7e6df319	7ed9fccd-dba8-495b-8573-efd185a63969	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	2	700.00	2026-03-14 15:29:39.334514
27856293-8df0-4967-b021-7497a6b7cb0c	7ed9fccd-dba8-495b-8573-efd185a63969	67e2c22d-618b-492b-a702-497986641cb0	2	210.00	2026-03-14 15:29:39.334514
f6ffd967-e91a-41ee-a231-c8361b9b257c	7ed9fccd-dba8-495b-8573-efd185a63969	cc2b20c4-de88-4e71-8362-7e532c35f96d	2	340.00	2026-03-14 15:29:39.334514
13ce9f0a-ad77-4262-987f-e96ca629c55d	be7c226f-0b47-4024-a0d4-9dbb42d38516	ccfc1c90-7a61-49dd-8823-33089a0c8733	1	300.00	2026-03-14 15:48:34.009547
bbde5497-6f08-412e-b5b6-d639a16dbed6	be7c226f-0b47-4024-a0d4-9dbb42d38516	3792d4e5-46cb-4020-9efc-31d8f6ed58d1	1	700.00	2026-03-14 15:48:34.009547
ed54d3e0-0307-4bb7-ad53-24ba257e6012	be7c226f-0b47-4024-a0d4-9dbb42d38516	67e2c22d-618b-492b-a702-497986641cb0	1	210.00	2026-03-14 15:48:34.009547
47282e32-6432-40ae-9f7e-f749332fee9f	be7c226f-0b47-4024-a0d4-9dbb42d38516	93556bce-e62a-4dca-aacd-8c71f9da5709	1	1100.00	2026-03-14 15:48:34.009547
309c6003-8925-4f57-9ae1-e95a01fe684b	be7c226f-0b47-4024-a0d4-9dbb42d38516	cc2b20c4-de88-4e71-8362-7e532c35f96d	1	340.00	2026-03-14 15:48:34.009547
c80375a3-837d-46f9-adbb-09a68cac696c	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	a2375971-165f-49ca-b108-c9245de19608	1	175.00	2026-03-14 15:56:59.920787
066f9724-e380-42e3-b3cb-dc11664f927f	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	cc2b20c4-de88-4e71-8362-7e532c35f96d	1	340.00	2026-03-14 15:56:59.920787
35736eae-766c-4b5e-9b6d-33f5f64db65d	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	794e24ac-5dca-41ee-8e4f-a81f131a9981	1	120.00	2026-03-14 15:56:59.920787
1ba37fa3-5406-440a-8cf4-ccac5b5be315	d9273fb6-b563-4c52-b580-6603fd1cec13	9b44459b-47fc-4499-acea-75497d458968	5	90.00	2026-03-14 17:32:43.258186
112956fc-ecef-4faf-a684-2a533aef5f35	d9273fb6-b563-4c52-b580-6603fd1cec13	794e24ac-5dca-41ee-8e4f-a81f131a9981	1	120.00	2026-03-14 17:32:43.258186
cb69cb0f-5c03-4583-ac38-4ca58737f4d7	d9273fb6-b563-4c52-b580-6603fd1cec13	285be12b-2f92-48c5-92da-9258218017b8	1	175.00	2026-03-14 17:32:43.258186
6bd9b667-5611-4a47-b914-26d28aaf1358	d9273fb6-b563-4c52-b580-6603fd1cec13	cc2b20c4-de88-4e71-8362-7e532c35f96d	1	340.00	2026-03-14 17:32:43.258186
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, address_id, subtotal, delivery_fee, discount_amount, total, delivery_distance_km, notes, status, payment_method, payment_status, created_at, updated_at, rider_id, is_rated) FROM stdin;
78a8cf87-4233-4c7e-a158-3758c2ec7ef7	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	635.00	80.00	0.00	715.00	9.00		delivered	cod	pending	2026-03-14 15:56:59.85194	2026-03-14 16:43:41.460078	021e0d50-2674-4832-80e0-54af2915abaa	t
dd939087-69f4-4e04-bfb2-6732f3cfddd3	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	1600.00	5.00	0.00	1605.00	9.00		delivered	cod	pending	2026-03-14 12:27:08.737603	2026-03-14 13:00:04.416736	021e0d50-2674-4832-80e0-54af2915abaa	t
37eaa333-cc5e-48fd-9b6f-bf1d6e7d8cd2	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	240.00	110.00	0.00	350.00	9.00		pending	cod	pending	2026-03-14 13:35:11.159569	2026-03-14 13:35:11.159569	\N	f
74a5f16d-8c23-4b06-90fa-76462e163650	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	100.00	110.00	0.00	210.00	9.00		pending	cod	pending	2026-03-14 13:36:23.040425	2026-03-14 13:36:23.040425	\N	f
6c073c69-dbc1-409f-9abe-b6d1814b142b	68434188-3e79-4d26-bcd4-c1109d69ea84	33ce4eed-335e-4e09-80af-7010014dc494	1800.00	2.00	0.00	1802.00	1.06		delivered	cod	pending	2026-03-14 11:50:40.589734	2026-03-14 11:54:53.199403	021e0d50-2674-4832-80e0-54af2915abaa	t
1d826c6e-a9e3-430d-b3c3-b4ed2caa6c0f	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	100.00	110.00	0.00	210.00	9.00		pending	cod	pending	2026-03-14 13:36:45.789718	2026-03-14 13:36:45.789718	\N	f
bdb2b031-102e-44c5-a058-2cc0b0821361	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	100.00	110.00	0.00	210.00	9.00		pending	cod	pending	2026-03-14 13:37:49.57581	2026-03-14 13:37:49.57581	\N	f
e1e4bec1-8d57-4802-8514-83b9512f6f39	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	420.00	110.00	0.00	530.00	9.00		pending	cod	pending	2026-03-14 13:52:49.825625	2026-03-14 13:52:49.825625	\N	f
02778b9e-c418-4452-b366-7e7cb1c00e66	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	700.00	110.00	0.00	810.00	9.00		pending	cod	pending	2026-03-14 13:53:30.393002	2026-03-14 13:53:30.393002	\N	f
b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	68434188-3e79-4d26-bcd4-c1109d69ea84	33ce4eed-335e-4e09-80af-7010014dc494	1190.00	2.00	0.00	1192.00	1.06		delivered	card	pending	2026-03-14 11:55:41.074088	2026-03-14 11:57:21.352891	021e0d50-2674-4832-80e0-54af2915abaa	t
754f57b0-0cd0-4509-8a6a-8a58596302b2	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	700.00	80.00	0.00	780.00	9.00		pending	cod	pending	2026-03-14 13:55:32.431992	2026-03-14 13:55:32.431992	\N	f
63e931cc-b2a5-4191-b3e1-de92acaa01cd	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	1500.00	80.00	0.00	1580.00	9.00		pending	cod	pending	2026-03-14 13:55:50.151871	2026-03-14 13:56:03.464896	\N	f
f279a3b4-3ee2-489b-b167-79aca3b54629	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	100.00	80.00	0.00	180.00	9.00		pending	cod	pending	2026-03-14 13:56:58.628591	2026-03-14 13:56:58.628591	\N	f
704b599e-544a-43ef-b23c-77793c7538ae	68434188-3e79-4d26-bcd4-c1109d69ea84	40e95dcd-6ba9-416a-914c-11c123277f64	790.00	5.00	0.00	795.00	24.50		confirmed	cod	pending	2026-03-14 12:02:37.004587	2026-03-14 12:22:17.949643	\N	f
7ed9fccd-dba8-495b-8573-efd185a63969	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	5315.00	80.00	0.00	5395.00	9.00		delivered	cod	pending	2026-03-14 15:29:39.265878	2026-03-14 15:33:05.311757	021e0d50-2674-4832-80e0-54af2915abaa	t
11a46417-999c-42e9-b69b-644dc9ca6a15	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	100.00	80.00	0.00	180.00	9.00		cancelled	cod	pending	2026-03-14 14:40:27.663711	2026-03-14 17:01:01.733717	021e0d50-2674-4832-80e0-54af2915abaa	f
d9273fb6-b563-4c52-b580-6603fd1cec13	68434188-3e79-4d26-bcd4-c1109d69ea84	33ce4eed-335e-4e09-80af-7010014dc494	1085.00	50.00	0.00	1135.00	1.06		pending	cod	pending	2026-03-14 17:32:43.229338	2026-03-14 17:32:43.229338	\N	f
ce89a644-db53-4c82-b854-f60be1761858	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	790.00	5.00	0.00	795.00	9.00		delivered	cod	pending	2026-03-14 11:59:01.734055	2026-03-14 12:22:46.711616	021e0d50-2674-4832-80e0-54af2915abaa	f
013a7dfb-d82c-41da-bf81-0b70798fb7b2	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	2320.00	80.00	0.00	2400.00	9.00		delivered	cod	pending	2026-03-14 15:06:31.172442	2026-03-14 15:08:19.450065	021e0d50-2674-4832-80e0-54af2915abaa	t
dc16a420-2392-46a4-84a7-6b73252eb0c6	68434188-3e79-4d26-bcd4-c1109d69ea84	40e95dcd-6ba9-416a-914c-11c123277f64	790.00	5.00	0.00	795.00	24.50		delivered	cod	pending	2026-03-14 12:01:31.361141	2026-03-14 12:30:02.042992	021e0d50-2674-4832-80e0-54af2915abaa	f
be7c226f-0b47-4024-a0d4-9dbb42d38516	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	2650.00	80.00	0.00	2730.00	9.00		delivered	cod	pending	2026-03-14 15:48:33.979166	2026-03-14 15:54:32.844615	021e0d50-2674-4832-80e0-54af2915abaa	t
94873738-0f9e-485a-9426-d40b59b7eeb0	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	2120.00	80.00	0.00	2200.00	9.00		delivered	cod	pending	2026-03-14 15:04:00.529466	2026-03-14 15:28:41.238689	021e0d50-2674-4832-80e0-54af2915abaa	f
47c12d0d-a5c0-4363-a2ab-166f0e98ad0f	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	240.00	80.00	0.00	320.00	9.00		cancelled	cod	pending	2026-03-14 14:29:20.12657	2026-03-14 16:54:37.611441	021e0d50-2674-4832-80e0-54af2915abaa	f
6592e7c3-252c-462b-8dab-bc54b612b7b0	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	90.00	80.00	0.00	170.00	9.00		cancelled	cod	pending	2026-03-14 14:16:16.972005	2026-03-14 16:57:19.446983	021e0d50-2674-4832-80e0-54af2915abaa	f
b37d0fc0-58ce-4b62-80b0-7011cdd9dc03	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	700.00	80.00	0.00	780.00	9.00		delivered	cod	pending	2026-03-14 14:47:15.941547	2026-03-14 16:00:05.216643	021e0d50-2674-4832-80e0-54af2915abaa	f
165572a6-c682-4f57-a909-e5f59debe91b	68434188-3e79-4d26-bcd4-c1109d69ea84	61fc7fcf-ec66-418d-9b7e-4f57e7fa2b39	450.00	80.00	0.00	530.00	9.00		cancelled	cod	pending	2026-03-14 14:15:09.591361	2026-03-14 16:59:42.247869	021e0d50-2674-4832-80e0-54af2915abaa	f
\.


--
-- Data for Name: otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otps (id, expires_at, is_used, attempts, phone_number, otp_hash, created_at) FROM stdin;
684d0261-9aea-4a24-9650-29103a42ae28	2026-03-14 11:54:33.415+00	t	1	03412248616	$2b$10$.IyHtn2Llm9HRueH7syrQuGEA91qJNBhGluibR8cC7SLrtzqBMcai	2026-03-14 11:49:33.416438
1d9732a0-a213-44fd-85a3-7de5727ced21	2026-03-14 11:57:57.275+00	t	1	03150258004	$2b$10$3idte58qYX3zOONNmk2UiejgG9FjnKdis5WYL04pD4A9/281YR.ee	2026-03-14 11:52:57.275931
4de5fa28-7d04-4092-bd44-fff24299fe87	2026-03-14 12:39:57.757+00	t	1	03452621787	$2b$10$V9GaSOMqCGVeC3LeHuedcetpXcMMFj4il1PgcfhAxQudrN.fU8q56	2026-03-14 12:34:57.758615
819029a0-0b60-4e22-94b9-afd5f79a6bd7	2026-03-14 12:56:41.996+00	t	2	03150258004	$2b$10$ttjRP93KoKG6vipsBILYDuT87WjL2atD9Av0.FPIS9gmMJSGqeqji	2026-03-14 12:51:41.997317
e6cef322-a91b-48e0-a8c6-bf4f2edb9c74	2026-03-14 12:58:46.786+00	t	1	03160007564	$2b$10$FewxyuV4Seq8fOnY1aH7hO0OlCGA3Z5dIChQ77kSriI1MKj7259GG	2026-03-14 12:53:46.787564
8a4c0e6b-fd27-4a47-a712-5b9b679365d2	2026-03-14 13:01:39.531+00	t	1	03150007564	$2b$10$P1WtKuka4HzsSJNVSzJGUe.HF/LarG5JUHK9xr50no4mZGzI18Ncu	2026-03-14 12:56:39.532464
2b811e31-781c-4333-ac4a-193e63c74619	2026-03-14 11:56:43.577+00	t	1	03150258004	$2b$10$B6L5dTIMwGLCyVlSgTMWCuF5zkL9Qk4OOl3kJ1WYlFQFjWMLT4kD.	2026-03-14 11:51:43.578749
efbdef4d-c5bb-4e9e-9e06-9035ab179bed	2026-03-14 12:38:41.849+00	t	2	03452621787	$2b$10$Oqs0n8Xbh7SQs5iFwaQOo.xhKzqXVrniHcXnwjuxL33Tgya2cX4sW	2026-03-14 12:33:41.850354
2310094e-39fd-4187-a1f4-0d6ada35003f	2026-03-14 12:49:01.229+00	t	1	03150258004	$2b$10$uqEaxU5bewFxgFqvFoG7qOhxqwcfOWlNx5B0aZvrYHfqT0sc97QMi	2026-03-14 12:44:01.230652
5e47c1e8-81c4-4279-9e34-a1c488e1cbba	2026-03-14 12:58:17.787+00	t	1	03150258004	$2b$10$/zt/z86TtEPsRmoQVQkPo.rk7CqqtgOg2dA1GFXF9AWggiUr7dOVO	2026-03-14 12:53:17.78871
5f8b9089-c275-4240-8f2c-378cfa0fd3e0	2026-03-14 13:00:26.528+00	t	1	03452621787	$2b$10$0nSYHTBWRlbBPGHLSYHIe.fQVlL/5pgTvFBJ4FlqO4n9vZIdXOKnS	2026-03-14 12:55:26.529496
8e41afa6-5ab4-463e-9607-ce14380501ee	2026-03-14 13:03:19.474+00	t	1	03150258004	$2b$10$vcoUcOROVaLXO2YvIimmdeVBD6yGOYp5f1OV9Pdf/VAF7jFOhnqny	2026-03-14 12:58:19.475391
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, amount, order_id, stripe_payment_intent_id, currency, status, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, category_id, description, price, discount_price, stock_quantity, is_active, name, image_url, created_at, updated_at) FROM stdin;
7ddd7406-640c-435f-bb9f-57f27cd26003	dfef9360-e2b6-4ca2-ab13-c859fa18b7e8	\N	100.00	0.00	500	t	Potatoes (Alu) 1kg	https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
77645f7b-807f-4c1b-95fd-3f0ccee2e491	dfef9360-e2b6-4ca2-ab13-c859fa18b7e8	\N	150.00	10.00	400	t	Onions (Piyaz) 1kg	https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
658b892d-193b-49e4-9aaa-e595d880a46e	dfef9360-e2b6-4ca2-ab13-c859fa18b7e8	\N	200.00	20.00	200	t	Tomatoes (Tamatar) 1kg	https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
132103a9-b12f-4bf5-81b9-65e17c623a73	dfef9360-e2b6-4ca2-ab13-c859fa18b7e8	\N	120.00	0.00	80	t	Okra (Bhindi) 500g	https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
f7bf977d-28c8-4604-b602-e287b149bb87	dc81ff83-b968-44b9-a689-27ae1d12b602	\N	180.00	10.00	200	t	Bananas (Dozen)	https://images.unsplash.com/photo-1603833665858-e61d17a86224?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
3e6809d6-36b9-450d-bd71-b6ad5d42c3dc	dc81ff83-b968-44b9-a689-27ae1d12b602	\N	350.00	30.00	150	t	Red Apples 1kg	https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
ccfc1c90-7a61-49dd-8823-33089a0c8733	dc81ff83-b968-44b9-a689-27ae1d12b602	\N	300.00	0.00	100	t	Oranges Dozen	https://images.unsplash.com/photo-1582979512210-99b6a53da1d7?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
3792d4e5-46cb-4020-9efc-31d8f6ed58d1	c449c570-4544-4e7b-a519-a0e92d7e7e15	\N	750.00	50.00	100	t	Fresh Chicken kg	https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
93556bce-e62a-4dca-aacd-8c71f9da5709	c449c570-4544-4e7b-a519-a0e92d7e7e15	\N	1200.00	100.00	50	t	Beef Boneless kg	https://images.unsplash.com/photo-1546248136-2470cda3bc6d?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
67e2c22d-618b-492b-a702-497986641cb0	6914c166-4424-46df-a6f4-b10279dbe19f	\N	210.00	0.00	200	t	Fresh Milk (1L)	https://images.unsplash.com/photo-1563636619-e9107da5a1bb?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
cc2b20c4-de88-4e71-8362-7e532c35f96d	6914c166-4424-46df-a6f4-b10279dbe19f	\N	360.00	20.00	100	t	Farm Eggs Dozen	https://images.unsplash.com/photo-1516746924755-90299f24419b?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
285be12b-2f92-48c5-92da-9258218017b8	f95aec00-89cc-4d96-8c8e-ca0b6ecb87ab	\N	180.00	5.00	300	t	Coca Cola 1.5L	https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
a2375971-165f-49ca-b108-c9245de19608	f95aec00-89cc-4d96-8c8e-ca0b6ecb87ab	\N	180.00	5.00	300	t	Pepsi 1.5L	https://images.unsplash.com/photo-1629203851022-3cd263900870?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
794e24ac-5dca-41ee-8e4f-a81f131a9981	2f7ee868-ad74-4fd5-a352-5e19ea7dcdc5	\N	120.00	0.00	200	t	Lays Classic Pack	https://images.unsplash.com/photo-1566478989037-e923e528d4fa?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
9b44459b-47fc-4499-acea-75497d458968	2f7ee868-ad74-4fd5-a352-5e19ea7dcdc5	\N	90.00	0.00	180	t	Digestive Biscuits	https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=400	2026-03-14 11:36:26.010466	2026-03-14 11:36:26.010466
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, user_id, order_id, product_id, rating, comment, created_at) FROM stdin;
\.


--
-- Data for Name: rider_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rider_reviews (id, rider_id, user_id, order_id, rating, comment, created_at) FROM stdin;
afa1bc3b-f0bb-4de4-82ca-89d21636a5ba	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	6c073c69-dbc1-409f-9abe-b6d1814b142b	3	U	2026-03-14 11:54:53.150949
4646bd3b-7a1a-4c8e-8110-d840dcc350cf	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	b60b43ff-dbd1-4277-89cd-bb4f55e2c2ca	2	...	2026-03-14 11:57:21.281886
33b487a7-1c9f-4d39-b2de-15adf028f53e	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	dd939087-69f4-4e04-bfb2-6732f3cfddd3	5		2026-03-14 13:00:04.345758
ed7ed054-3e1f-4cef-afa0-910cb6e9fe12	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	013a7dfb-d82c-41da-bf81-0b70798fb7b2	3		2026-03-14 15:08:19.369689
ff1810b6-d9f1-434a-9412-38539193a214	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	7ed9fccd-dba8-495b-8573-efd185a63969	5		2026-03-14 15:33:05.293311
ddf8a4f2-babb-40e1-883d-bbaf1d7b912b	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	be7c226f-0b47-4024-a0d4-9dbb42d38516	5		2026-03-14 15:54:32.772055
f1198859-3d00-4a6e-b777-3a0e8dc7d1b5	021e0d50-2674-4832-80e0-54af2915abaa	68434188-3e79-4d26-bcd4-c1109d69ea84	78a8cf87-4233-4c7e-a158-3758c2ec7ef7	5		2026-03-14 16:43:41.440398
\.


--
-- Data for Name: riders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.riders (id, firebase_uid, name, email, phone_number, vehicle_type, vehicle_number, cnic_front_url, cnic_back_url, selfie_url, is_profile_complete, is_online, current_lat, current_lng, total_earnings, created_at, updated_at, average_rating, total_reviews) FROM stdin;
021e0d50-2674-4832-80e0-54af2915abaa	rider_1773489128355	Bashar Syed 	rider_1773489128355@baldia.mart	03150258004	Bike	ABC-1234	mock_url_for_cnic_front	mock_url_for_cnic_back	mock_url_for_selfie	t	f	\N	\N	21999.00	2026-03-14 11:52:08.35632	2026-03-14 16:43:41.464044	4.00	7
a030dc39-27ad-426f-9a84-52b4fe4d9375	rider_1773491650972	Wajid Syed	rider_1773491650972@baldia.mart	03452621787	Bike	ABC-1234	mock_url_for_cnic_front	mock_url_for_cnic_back	mock_url_for_selfie	t	f	\N	\N	0.00	2026-03-14 12:34:10.973611	2026-03-14 12:34:54.224491	5.00	0
3e2bfde4-32c7-40c1-97a6-d71aec8ca7b6	rider_1773492839851	Abdullah	rider_1773492839851@baldia.mart	03160007564	Bike	ABC-7652	mock_url_for_cnic_front	mock_url_for_cnic_back	mock_url_for_selfie	t	f	\N	\N	0.00	2026-03-14 12:53:59.853163	2026-03-14 12:54:50.794211	5.00	0
9d92fff3-ca35-4b80-8848-980c055505ea	rider_1773493014194	Shahab	rider_1773493014194@baldia.mart	03150007564	Bike	AJK-0987	mock_url_for_cnic_front	mock_url_for_cnic_back	mock_url_for_selfie	t	f	\N	\N	0.00	2026-03-14 12:56:54.195987	2026-03-14 12:57:41.33523	5.00	0
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, "createdAt", "updatedAt") FROM stdin;
base_delivery_fee	2.00	2026-03-13 21:50:13.107602	2026-03-13 21:50:13.107602
tax_rate_percentage	5.00	2026-03-13 21:50:13.131712	2026-03-13 21:50:13.131712
delivery_threshold_km	3	2026-03-14 13:13:47.520638	2026-03-14 13:13:47.520638
delivery_base_fee	50	2026-03-14 13:13:47.497417	2026-03-14 13:33:45.689974
delivery_per_km_fee	5	2026-03-14 13:13:47.533087	2026-03-14 13:53:48.812482
store_status	open	2026-03-13 21:50:13.028846	2026-03-14 17:45:55.116211
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, is_phone_verified, firebase_uid, name, email, phone_number, role, created_at, updated_at, password) FROM stdin;
99999999-9999-9999-9999-999999999999	f	mock-google	Mock Google User	mock@google.com	\N	customer	2026-03-14 11:36:25.643979	2026-03-14 11:36:25.643979	\N
88888888-8888-8888-8888-888888888888	f	\N	Super Admin	admin@baldiamart.com	\N	admin	2026-03-14 11:36:25.96788	2026-03-14 11:36:25.96788	$2b$10$L8PPy/HGi7RFGi4HKJMXOO/4GYcXVXqOwikas6CvjeeYzkzY4jHAi
68434188-3e79-4d26-bcd4-c1109d69ea84	t	\N	Sagheer Syed 	sagheersyed333@gmail.com	03412248616	customer	2026-03-14 11:49:48.191326	2026-03-14 11:49:59.611985	\N
\.


--
-- Name: rider_reviews PK_4eb599c7b3525e63ea5ed75d7fe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rider_reviews
    ADD CONSTRAINT "PK_4eb599c7b3525e63ea5ed75d7fe" PRIMARY KEY (id);


--
-- Name: order_histories PK_580471ac7bdbe26a80ca6f5b7e4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_histories
    ADD CONSTRAINT "PK_580471ac7bdbe26a80ca6f5b7e4" PRIMARY KEY (id);


--
-- Name: riders PK_6c17e67f760677500c29d68e689; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "PK_6c17e67f760677500c29d68e689" PRIMARY KEY (id);


--
-- Name: settings PK_c8639b7626fa94ba8265628f214; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY (key);


--
-- Name: users UQ_0fd54ced5cc75f7cb92925dd803; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_0fd54ced5cc75f7cb92925dd803" UNIQUE (firebase_uid);


--
-- Name: users UQ_17d1817f241f10a3dbafb169fd2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE (phone_number);


--
-- Name: rider_reviews UQ_2e4581057c51515ac0f00c28912; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rider_reviews
    ADD CONSTRAINT "UQ_2e4581057c51515ac0f00c28912" UNIQUE (order_id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: riders UQ_ec7bb709acb3c2d5fe0209c3a3f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "UQ_ec7bb709acb3c2d5fe0209c3a3f" UNIQUE (firebase_uid);


--
-- Name: riders UQ_ed6e8eb2542a3c7c1742f9c2b54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "UQ_ed6e8eb2542a3c7c1742f9c2b54" UNIQUE (email);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_4f7aa837cc30b5f0a9bbb28c31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4f7aa837cc30b5f0a9bbb28c31" ON public.otps USING btree (phone_number);


--
-- Name: order_items FK_145532db85752b29c57d2b7b1f1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: addresses FK_16aac8a9f6f9c1dd6bcb75ec023; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rider_reviews FK_29da45ae0d946452dff87d79f78; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rider_reviews
    ADD CONSTRAINT "FK_29da45ae0d946452dff87d79f78" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rider_reviews FK_2e4581057c51515ac0f00c28912; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rider_reviews
    ADD CONSTRAINT "FK_2e4581057c51515ac0f00c28912" FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: cart_items FK_30e89257a105eab7648a35c7fce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: rider_reviews FK_7ee5544fa01ca4622d8272f729e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rider_reviews
    ADD CONSTRAINT "FK_7ee5544fa01ca4622d8272f729e" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: order_items FK_9263386c35b6b242540f9493b00; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: products FK_9a5f6868c96e0069e699f33e124; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: notifications FK_9a8a82462cab47c73d25f49261f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: orders FK_a261413fe1e85c38c6c5cb9bede; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_a261413fe1e85c38c6c5cb9bede" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: orders FK_a922b820eeef29ac1c6800e826a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart_items FK_b7213c20c1ecdc6597abc8f1212; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_b7213c20c1ecdc6597abc8f1212" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: orders FK_d39c53244703b8534307adcd073; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_d39c53244703b8534307adcd073" FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- Name: order_histories FK_ec45deda93355b4a61d0f7db306; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_histories
    ADD CONSTRAINT "FK_ec45deda93355b4a61d0f7db306" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: notifications FK_fe1cdff9d3512e4e4693181ab0d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_fe1cdff9d3512e4e4693181ab0d" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict THjwdQEFJXeE2hP0GE8VbDs3JYUb8EjOmaByFjUEPBOQhULsN7pXdEAmVHHaQDb

